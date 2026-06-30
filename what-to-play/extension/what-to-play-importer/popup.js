const extensionApi = globalThis.browser ?? globalThis.chrome;
const usesPromiseApi = Boolean(globalThis.browser);
const appUrlInput = document.querySelector("#app-url");
const tokenInput = document.querySelector("#token");
const statusElement = document.querySelector("#status");
const buttons = Array.from(document.querySelectorAll("button"));

function storageGet(keys) {
  if (usesPromiseApi) {
    return extensionApi.storage.local.get(keys);
  }

  return new Promise((resolve) => {
    extensionApi.storage.local.get(keys, resolve);
  });
}

function storageSet(values) {
  if (usesPromiseApi) {
    return extensionApi.storage.local.set(values);
  }

  return new Promise((resolve) => {
    extensionApi.storage.local.set(values, resolve);
  });
}

function queryActiveTab() {
  if (usesPromiseApi) {
    return extensionApi.tabs.query({ active: true, currentWindow: true }).then(
      (tabs) => tabs[0],
    );
  }

  return new Promise((resolve) => {
    extensionApi.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function executeScraper(tabId) {
  if (usesPromiseApi) {
    return extensionApi.scripting
      .executeScript({
        target: { tabId },
        func: scrapeCurrentPage,
      })
      .then((results) => results?.[0]?.result);
  }

  return new Promise((resolve, reject) => {
    extensionApi.scripting.executeScript(
      {
        target: { tabId },
        func: scrapeCurrentPage,
      },
      (results) => {
        const error = extensionApi.runtime.lastError;

        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(results?.[0]?.result);
      },
    );
  });
}

function executeSteamFamilyReader(tabId) {
  const options = {
    target: { tabId },
    func: readSteamFamilyFromStorePage,
  };

  if (usesPromiseApi) {
    return extensionApi.scripting
      .executeScript(options)
      .then((results) => results?.[0]?.result);
  }

  return new Promise((resolve, reject) => {
    extensionApi.scripting.executeScript(options, (results) => {
      const error = extensionApi.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(results?.[0]?.result);
    });
  });
}

function setBusy(busy) {
  buttons.forEach((button) => {
    button.disabled = busy;
  });
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

async function getConnection() {
  const appUrl = appUrlInput.value.trim().replace(/\/+$/, "");
  const token = tokenInput.value.trim();

  if (!appUrl || !token) {
    throw new Error("Renseigne l'URL et le code de liaison.");
  }

  return { appUrl, token };
}

async function sendImport(source, games) {
  const { appUrl, token } = await getConnection();
  const response = await fetch(`${appUrl}/api/import/browser`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ games, source }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Import refuse par WhatToPlay.");
  }

  setStatus(
    `${payload.imported} importes, ${payload.duplicate} deja presents, ` +
      `${payload.unmatched} non reconnus.` +
      (payload.unmatchedGames?.length
        ? ` Titres: ${payload.unmatchedGames
            .map(
              (game) =>
                game.normalizedName || game.receivedName || "nom manquant",
            )
            .join(", ")}.`
        : ""),
  );
}

async function readSteamFamilyFromStorePage() {
  function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  function normalizeText(value) {
    return (value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  function findControl(labels) {
    const normalizedLabels = labels.map(normalizeText);
    const elements = Array.from(
      document.querySelectorAll(
        "button, a, [role='tab'], [role='button'], div",
      ),
    );

    return elements
      .filter((element) => {
        const text = normalizeText(element.textContent);
        const visible = element.getClientRects().length > 0;

        return visible && normalizedLabels.some((label) => text === label);
      })
      .sort((left, right) => left.childElementCount - right.childElementCount)[0];
  }

  function findScrollableAncestor(element) {
    let current = element;

    while (current && current !== document.body) {
      if (current.scrollHeight > current.clientHeight + 20) {
        return current;
      }

      current = current.parentElement;
    }

    return document.scrollingElement;
  }

  try {
    if (
      location.hostname !== "store.steampowered.com" ||
      !location.pathname.includes("/account/familymanagement")
    ) {
      throw new Error(
        "Ouvre la page Gestion de la famille sur le magasin Steam avant l'import.",
      );
    }

    const libraryTab = findControl(["Bibliotheque", "Library"]);

    if (libraryTab) {
      libraryTab.click();
      await sleep(1200);
    }

    const showAllButtons = Array.from(
      document.querySelectorAll("button, [role='button']"),
    ).filter((element) =>
      ["AFFICHER TOUT", "TOUT AFFICHER", "SHOW ALL"].includes(
        normalizeText(element.textContent),
      ),
    );

    showAllButtons.forEach((button) => button.click());

    if (showAllButtons.length > 0) {
      await sleep(1200);
    }

    const gamesByAppId = new Map();

    function collectVisibleGames() {
      document
        .querySelectorAll('img[src*="/apps/"], img[src*="/steam/apps/"]')
        .forEach((image) => {
          const match = image.src.match(/\/apps\/(\d+)\//);
          const steamAppId = Number(match?.[1]);

          if (!steamAppId || gamesByAppId.has(steamAppId)) {
            return;
          }

          gamesByAppId.set(steamAppId, {
            imageUrl: image.src,
            name: image.alt?.trim() || `Jeu Steam ${steamAppId}`,
            steamAppId,
          });
        });
    }

    collectVisibleGames();

    const firstGameImage = document.querySelector(
      'img[src*="/apps/"], img[src*="/steam/apps/"]',
    );

    if (!firstGameImage) {
      throw new Error(
        "Steam n'affiche encore aucun jeu. Ouvre l'onglet Bibliotheque, " +
          "clique sur Afficher tout, puis relance l'import.",
      );
    }

    const scrollContainers = new Set(
      Array.from(
        document.querySelectorAll(
          'img[src*="/apps/"], img[src*="/steam/apps/"]',
        ),
      )
        .map(findScrollableAncestor)
        .filter(Boolean),
    );
    let unchangedPasses = 0;
    let previousSize = gamesByAppId.size;

    for (let pass = 0; pass < 250 && unchangedPasses < 12; pass += 1) {
      const rows = Array.from(document.querySelectorAll("[data-index]"));
      const lastRow = rows.at(-1);

      if (lastRow) {
        lastRow.scrollIntoView({ block: "end" });
      }

      scrollContainers.forEach((scrollContainer) => {
        scrollContainer.scrollTop += Math.max(
          Math.floor(scrollContainer.clientHeight * 0.8),
          400,
        );
      });

      await sleep(80);
      collectVisibleGames();

      if (gamesByAppId.size === previousSize) {
        unchangedPasses += 1;
      } else {
        unchangedPasses = 0;
        previousSize = gamesByAppId.size;
      }
    }

    const games = Array.from(gamesByAppId.values());

    return { games };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant la lecture de Steam Family.",
    };
  }
}

function scrapeCurrentPage() {
  const host = location.hostname;
  const seen = new Set();
  const games = [];

  if (host.includes("retroachievements.org")) {
    document.querySelectorAll('a[href*="/game/"]').forEach((link) => {
      const match = link.href.match(/\/game\/(\d+)/);
      const name = link.textContent?.trim();

      if (!match || !name || seen.has(match[1])) {
        return;
      }

      const container = link.closest("article, li, tr, div");
      const text = container?.textContent ?? "";
      const totalMatch = text.match(/(\d+)\s+(?:achievements|succes)/i);
      const image = container?.querySelector("img");
      seen.add(match[1]);
      games.push({
        achievementTotal: totalMatch ? Number(totalMatch[1]) : undefined,
        externalId: match[1],
        imageUrl: image?.src,
        name,
      });
    });

    return { games, source: "retroachievements" };
  }

  if (host.includes("instant-gaming.com")) {
    document.querySelectorAll('a[href*="instant-gaming.com/"]').forEach((link) => {
      const match = link.href.match(/\/(\d+)-[^/]+\/?$/);
      const container = link.closest("article, li, div");
      const image = container?.querySelector("img");
      const name = [
        container?.querySelector("h2, h3, .name, .title")?.textContent,
        image?.alt,
        link.getAttribute("title"),
        link.textContent,
      ]
        .map((value) => value?.replace(/\s+/g, " ").trim())
        .find(
          (value) =>
            value &&
            value.length >= 2 &&
            !/^(?:image|cover|wishlist|favori)$/iu.test(value),
        );
      const gameName = name
        ?.replace(/^(?:acheter|buy)\s+/iu, "")
        ?.replace(
          /\s+(?:[-\u2013\u2014]\s*)?(?:PC|Mac|Linux|Xbox|PlayStation|PS[345]|Nintendo|Switch)\b.*$/iu,
          "",
        )
        .trim();

      if (!match || !gameName || gameName.length < 2 || seen.has(match[1])) {
        return;
      }

      seen.add(match[1]);
      games.push({
        externalId: match[1],
        imageUrl: image?.src,
        name: gameName,
      });
    });

    return { games, source: "instant_gaming" };
  }

  return null;
}

document.querySelector("#save").addEventListener("click", async () => {
  await storageSet({
    appUrl: appUrlInput.value.trim(),
    token: tokenInput.value.trim(),
  });
  setStatus("Liaison enregistree.");
});

document.querySelector("#steam-family").addEventListener("click", async () => {
  setBusy(true);
  setStatus("Lecture de Steam Family...");

  try {
    const tab = await queryActiveTab();
    const result = await executeSteamFamilyReader(tab.id);

    if (result?.error) {
      throw new Error(result.error);
    }

    if (!result?.games?.length) {
      throw new Error(
        "La famille existe, mais Steam n'a retourne aucun jeu partage.",
      );
    }

    await sendImport("steam_family", result.games);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
});

document.querySelector("#current-page").addEventListener("click", async () => {
  setBusy(true);
  setStatus("Lecture de la page...");

  try {
    const tab = await queryActiveTab();
    const result = await executeScraper(tab.id);

    if (!result?.games?.length) {
      throw new Error(
        "Ouvre ta liste RetroAchievements ou Instant Gaming avant l'import.",
      );
    }

    await sendImport(result.source, result.games);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
});

storageGet(["appUrl", "token"]).then((stored) => {
  appUrlInput.value = stored.appUrl || "http://localhost:3000";
  tokenInput.value = stored.token || "";
});
