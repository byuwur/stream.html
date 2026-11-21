document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  const platforms = { twitch: "Twitch", youtube: "YouTube", kick: "Kick", tiktok: "TikTok" };
  const colors = { twitch: "#caf", youtube: "#f88", kick: "#9d6", tiktok: "#7ee" };
  // Embedded 64px PNGs from the Wikimedia Twitch_icon_2012, YouTube_full-color_icon_(2017),
  // Kick.com_icon_logo (K glyph) and Tiktok_icon artwork.
  const platformLogos = {
    twitch:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACoUlEQVR4AeybAW6bMBSGf9McJDcp7BZbNWlTM2m36HKLSYuUVRPbMcpNmoO0eHmqkADbxQY/yzZYekpj/B7v/3g2CW4KGNr9h/p8qGqZm30v/+37ko0AIFFiBc0IQAADUsi0aQF8K+svmepVZGkBtAVulZGZdmgBwDD/JXCBbKtkDNNNC8A0/wXE5dR8blKwHXaXafmAAmBN858AKQDWNP+1AEzznwbnaEoFiJXc/7uLOQAw/pjYDcr5dQAgZ6EmbRsAE5m19AergEP5p6TPGH2zWXN0ftQ39wKN/YIBkKI4S4GBvaK1+Mpd3I79IG4exkLmvg8GYG6C3H4bAG7CscffKiD2K8Sd31YB3IRjj79VQOxXiDu/rQK4Cccef6uA2K8Qd35bBXAT7uIXEkch8bVvNyia7rjpdYfise9Df0O+Hk3jx/1T74upAb6O/2rufo/tZ/NxcveGxoz9aGfKV17BAPhK2HecbAG8CHm2gZUlgEP19wmQFo/boG6O2lCLeYyLeNKRVQVMipdtRYsqCe8sGwA24nV3jywAzBVPVZA8gCXikwewVHzSAHyIdwYgIff3Vf1sa4eyfqCT6Iz2BW3jjMfRv+/ivfv8dbXXLXi6PJzWAAHsXQyGRuJfRPvsEqs/1hD2rdtBPDk4ASCHpdaJXxpH6+8onmIEBRCb+KAAQoknUS4WpAJiFU+g2AHELJ4dgCywp9WeTuTdZix4uhxYK+D6/I7ndweexBMQVgB0Au/mUTzllhYAz+LTAsAgPh0ATOLTAMAoXg9A4gdsDWJyZwdKu/rYxmcWT6kNFkF6YHhq7o62JqR8pCD2JprT06fKNr7tV1r786sjBwDUwz573sT7jOgjViAAcYongAEAxCs+AIC4xTMDCCOeRCyx/wAAAP//KP6L1QAAAAZJREFUAwABqO8JeY9XVAAAAABJRU5ErkJggg==",
    youtube:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAD30lEQVR4AeyZL0wcQRTGvyJJ2mBpRSEkrUGBhKQgsCiQBFBgSMCA5JBgIMEQDBQLhuAICTQBCYYg2vCvosWSViDp+w13m7tlyp9jb3e5PTLfzszbnffe9+2bvT2uThn/qwmQ8QJQrQJqFZBxBWpbIOMFUHsIRrIFbqW3RXhv4zA+ma0chP0wD2JFUb0PCmBJNxmGDNN57FoPLqy/LcAS+VOEXzYO47vZykHYD/MgViG+9eQDyG3F5oCcyb3LYv+3eQUwByy+sFVgxfpcHjgDTTZPUyMfQG5DlhggZ3JHFMSZNvu9ViKAEeeO79pVLMahDauiwSVn/BCCcUCqRACzQh4VbViVDfJUBL0jGAhg6kA+OOHOVucBjmwNx84JYOS568AZq/mQ59aV5xy8BwzmT2Spc5xdBRjrLN19o+ua41wQgH3hrBk6OM51hb2QIeIBVbhTAU6JwJqxAQJ8zBjnYrpfEKDyFTA6KjU3FwdOzRgB4knm7Eya9r6OxxPfH6ULASpfAQR/80bK5aTTU2lgAEsqgADxJtLSIq2tSdvbUkdHvLE90RAgngoIB+/pkfb3paUlqbExfDaueRMCxBXMH2dk5G5bTE76z1fYmrwAEKyvl2ZnpeNjqa8PS2xAgGS2gI9ia6u0vi5tbkptbb4roralYAv4KPX2SoeH0vy81NDguyIyGxUQmbPIHY2PS7w/jI2V7fqxhekW4LHsIzifbgEWFiTeGxYXI6Dqd5FOAba2pPZ2aWJCur72Zx6RFQEuI/L1cjcnJ1J/v8RD8Ojo5f6e4AEBnnBZhS+5uZGmpiQ+Bjc2KhysxP1l8gIsL9/t87m5kszimiBAMltgZ0fq7JR4Fb66iotvOE4CFXB+Lg3af6T5MnRwEE4o9nm8FTAzc1fufB2Onao3oKuAeLYAn+e5nDeLJI1UQOXj852f0q98pOdGcBXw7bmrquj6n/FUQHoV20OAeJ4BKRWhzv5XiwB7Kc2vomnBnQogCCLQv3o8g8Aq1xYEsA9oppnCV9g6ASgFm2RpG+wZZ8fXCWDkacN2yMJWuDTy3cbVtUAAM0KeE/TuZBUe4AbHgFogAJYiEXhndSWCvQoA8ZzxazYwDiiVCICVCwwzBpTiN222BuCpCRAGJ4AlaQC5FEB+5MlNJG9IA++D/p4AxWxMBPbLqvVg2HrQbT0OgQ31ztYU44PNw/hstnIQ9sM8iGXB+c0ZkEsB5Eee3ETyRhgL728PCuBfUmq1JP6G8NvmYfwwWzkI+2EexCvNpLzZiwUoL2x6VtUESM+9SCaTWgUko3t6otYqID33IplMXn0FvFS2fwAAAP//riufmQAAAAZJREFUAwAr9hCQytXNJgAAAABJRU5ErkJggg==",
    kick: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAB8ElEQVR4AeyaX07CQBDGZxHu0PiE9zBRb2BQn8GTiCcR35V4A+Uk8Ng7QFhnk4ZsyW63Le3+mU7TD7Zs6cz85gubtIxA217217dPh0x2rK0WotEQ89iiOs1nts/e9CRKAPSJoYwZwFA6bauTHWAjM5TP2QGhO43LnFrqjMLcpqhe9xgcoIq0qdfi1cVjAKDyCCYGEAx9JIHZAZE0IlgaPhwwxaXu16ZglReBfQBQoe7xxSac8refR/IF4DxuNMcMIJpWBEqEHRAIfDRhqTpgJQFeTcKCNzp9PNYPaYyx8M16nK9M+prkf3qVJAHoBbrGDMBFiPo8O4B6h131peyAlZSwlAYdr6D0Sw8VW7IAhITP9SR/N+lH5LuKmktTyQIoVXHBAXkALjYMwEWI+jw7INUOSwFz9XcXk573mbr/WKu0lB2wEAKWJh0FqGeNUGdLGUCd+pznMAAnIuInsAOIN9hZHkkHCIC72SFbmPQos9IKQRIAtn2BED5MGh1gjvOnnSqAU4GuAQNwEaI+T84BTRvGAJoSa3m+uklpU8tLdvM1Hw7YfY/zB5u6KaP9VXwAaJ+dh28yAA+Qow7BDoi6PR6Si8EB6jFWlXrFEBwALo83NvVaeXHx4ACKPIK9MYBg6CMJzA6IpBHB0kjeAZeS+wcAAP//EGPiYwAAAAZJREFUAwBMWxKWZtELGAAAAABJRU5ErkJggg==",
    tiktok:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAE4klEQVR4AeybT04UQRTGe7gCcQ1siK5NZKEJMwsMN9C4gqUuNPECzBxAE13oEtgYvQGRBZDoAhPXGjYMWw1HkPH9WooUQ0/Xq5qqoWvE1Juqrnr16vu+rj/drc4Uuj8r4vZK7IvYL7E/YoOGGZjABkawglkg1ieXAE+l+w+xz2Ivxe6L3RJz9ROXiScwgQ2MYAUz2OEwEgydqhrvSiVKvpP8tliuCexwgAucrvCoEuCReH0TQ0nJpiLBBU5wu0RoWAAcPorHcL1UZZ/gBDc4XpCh0lwwRT6YiynO4QjXkqItwBupsa/lcjJpc3OzOD4+rrX5+flYYOAI1zIeFxTYKVknlCdukNNYRGBwhXNhBHgeMXguoUrOCMADA8dFo4FvbGzExgfnFQRYjR05RTyWSIK4qwiwlCBw9JAIkGAWLCHAYnS0iQKura0VCBEx/CICzEYMmDQU5DkyIw4yiwBYxJhpQ7Xb7SLiUpjJiryRttvtBotgYpg8SwEAjwh7e3tj7wnZCoAILAdEYF+gTJ2vZS0AZNkYOR0QgvcJxMC0gmQvACIYM2IgyPLysqmuzadKgFqmIxpvBBghzH9Tnc0M2NraSnJTshGg1+sVnU6n6Pf7UYVIIgC7MY+rGMeTbbSFMtjf3y9FWF9fLyiHxrH7RRMAYhDmLMa68riKteXZ3TZ78JAyM4Dl0JHZsLCwUIwrRhQBDHEII0QIsZA+thitVqtAEAxxtre3VSHHEgCyTG+Iq0YTJ0BLliQRG2N5kGsGCRaAac1UJ9cM1FSfIAHMnW8qKR9cQQJw530GuU5f19jeArDmXUFzavcSgPWO5UTQhdVLAN6zXQFNO7swpwNHUqv174iibNqbkqsF4B2bzU8DHOKcxzy+ciTRB0FMmeummFoA7QcG7jLEm0LQhUMtgGbt84jaxLtcJ4JaAM3057m8brAmtqkEYP27wHP3XT5NbFcJoAF+cHCgcWucj0qAubk5J3B2eadTAx1UApycnDiha0+JqkCa/aWqX4w6lQCau6s5JaoAs79oBNBgqIrvqosmgIZEFZhxZk5VPN+6qALwZcgXgGbmpDxhVAJASvOAw3TWECIexpulZuakPGHUAvTkszSg6wwyvDC5ZgJ+kNeK5TMD6vBVtakFYBPCqoLYdZDjZQiCwzOCNsShTUs+9dOllwCaWWDEgCCzAbJ8QRoMBuU/hUUchDB+dTnLLuXdZ2wEOKOgMQBhGl/bR0vY7kPZR3D8A+wMAU61Hfv9fvkXEeTaPqF+3PkQsT3HO0WAI59OkOedn9ynn48vsVOv/XM8RwhweH6hzgCYSgRi8zVJDWY8x0ME2AmJAdDYIjDlJ0ge2jsIsCuln2LeyYjAzu7d2epAHGIgqFWdugjnXQRgoLf8hBjg2a25c5DwiUFf+tCXGD59I/iWnI0A7yXgV7HgBBlIQIY7CTGmNEabMa5pwwdf+gQPGt4RrnC++B8jhHohP+pnAvGtTBCFJMQgiUHUGNe04VMZIH0lHOFajmRmABff5eeJ2LQnOMK15GkLQMUn+XkshkqSTVWCE9zgeEFsWAAacLgnBdaJZFOR4AInuF0iVCUADkyRB1J4JsZxIVmWCexwgAucrpAYJYBxZKe8IxcPxV6LoeRvyZlOkl1/shCACWxgBCuYwQ4Hy+1y8S8AAAD//6+VDagAAAAGSURBVAMA5kLmZpqdvCMAAAAASUVORK5CYII="
  };

  function platformIcon(id) {
    const icon = new Image();
    icon.src = platformLogos[id];
    icon.alt = platforms[id];
    return icon;
  }
  // ===== DEMO MESSAGES =====
  const demo = [
    { platform: "twitch", name: "MossCircuit", text: "The tide pools look different at night 🌙" },
    { platform: "youtube", name: "Juniper", text: "Caught the reflection just as you turned!" },
    { platform: "kick", name: "LowOrbit", text: "One more run before sunrise?" },
    { platform: "tiktok", name: "Mar de luz", text: "Aquí seguimos ✨" }
  ];
  const bounded = (value, max) => typeof value === "string" && value.length <= max;
  function demoMessages(raw) {
    try {
      if (!bounded(raw, 65536)) return null;
      const rows = JSON.parse(raw);
      const validRow = (row) => row && typeof row.platform === "string" && Object.hasOwn(platforms, row.platform) && bounded(row.name, 80) && bounded(row.text, 1000);
      if (!Array.isArray(rows) || rows.length > 40 || !rows.every(validRow)) return null;
      return rows.map(({ platform, name, text }) => ({ platform, name, text }));
    } catch {
      return null;
    }
  }
  // ===== RESOURCE CONFIGURATION =====
  const resource = {
    version: "1.1",
    title: "Chat",
    description: "Style a four-platform chat demo. Platform connections are TBD.",
    preview: [960, 540],
    urlRequired: ["layout"],
    presets: true,
    elements: {
      overlay: { label: "Appearance", selector: "#overlay .panel", gap: true },
      bubble: { label: "Message row", premade: "vertical", slideDistance: -4, selector: "#overlay .row", fields: ["messages"] },
      message: { label: "Message text", selector: "#overlay .body", parent: "bubble" },
      identity: { label: "Identity", selector: "#overlay .identity", parent: "bubble", textOverflow: false },
      name: { label: "Display name", selector: "#overlay .name", parent: "identity", fields: ["nameMode", "nameColor", "showUsernames"], when: ["showUsernames", "yes"] },
      stamp: { label: "Timestamp", selector: "#overlay .stamp", parent: "identity", fields: ["showTimestamps"], when: ["showTimestamps", "yes"], textOverflow: true },
      avatar: { label: "Avatar", selector: "#overlay .avatar", parent: "identity", fields: ["showAvatars"], when: ["showAvatars", "yes"], textOverflow: "#overlay .avatar:not(:has(img))" },
      badge: { label: "Badge", selector: "#overlay .badge", parent: "identity", fields: ["showBadges"], when: ["showBadges", "yes"], textOverflow: true },
      platform: { label: "Platform", selector: "#overlay .platform", parent: "identity", fields: ["showPlatforms"], when: ["showPlatforms", "yes"] },
      waitingText: { label: "Waiting message", selector: "#overlay .waiting", fields: ["waiting"], when: ["waiting", "yes"] }
    },
    fields: {
      source: {
        type: "select",
        label: "Chat source",
        default: "demo",
        section: "Content & behavior",
        options: { demo: "Local demo", integration: "Platform integration (TBD)" },
        description: "Platform connections are TBD. The demo uses only local messages."
      },
      layout: { type: "select", label: "Message style", default: "bubble", section: "Content & behavior", options: { stacked: "Stacked", inline: "Inline", bubble: "Bubble" } },
      limit: { type: "number", label: "Visible messages", default: 12, section: "Content & behavior", min: 1, max: 100, step: 1 },
      expires: {
        type: "number",
        label: "Expire after (seconds)",
        default: 0,
        section: "Content & behavior",
        min: 0,
        max: 86400,
        step: "any",
        description: "0 keeps messages until they leave the list."
      },
      flow: {
        type: "select",
        label: "Message order",
        default: "latest-last",
        section: "Content & behavior",
        options: { "latest-last": "Newest at bottom", "latest-first": "Newest at top" }
      },
      waiting: {
        type: "switch",
        label: "Show waiting label when empty",
        default: "no",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        when: ["source", "integration"]
      },
      height: {
        type: "number",
        label: "Maximum height (px)",
        default: 0,
        section: "Size & placement",
        min: 0,
        max: 2160,
        styleSelector: "#overlay .panel",
        styleProperty: "max-height",
        styleValue: (settings) => `min(100%, ${settings.height}px)`
      },
      spacing: {
        type: "number",
        label: "Message spacing (px)",
        default: 8,
        section: "Appearance",
        min: 0,
        max: 100,
        styleSelector: "#overlay .panel",
        styleProperty: "gap",
        styleUnit: "px"
      },
      nameMode: {
        type: "select",
        label: "Name color",
        default: "platform",
        section: "Appearance",
        options: { sender: "Sender or platform", platform: "Platform", fixed: "Single color" }
      },
      showTimestamps: {
        type: "switch",
        label: "Show timestamps",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      showUsernames: {
        type: "switch",
        label: "Show usernames",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      showAvatars: {
        type: "switch",
        label: "Show avatars",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      showPlatforms: {
        type: "switch",
        label: "Show platforms",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      showBadges: {
        type: "switch",
        label: "Show badges",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      horizontal: {
        type: "select",
        label: "Horizontal placement",
        default: "flex-start",
        section: "Size & placement",
        options: { "flex-start": "Left", center: "Center", "flex-end": "Right" },
        styleSelector: "#overlay",
        styleProperty: "justify-content"
      },
      vertical: {
        type: "select",
        label: "Vertical placement",
        default: "flex-end",
        section: "Size & placement",
        options: { "flex-start": "Top", center: "Center", "flex-end": "Bottom" },
        styleSelector: "#overlay",
        styleProperty: "align-items"
      },
      align: {
        type: "select",
        label: "Text alignment",
        default: "left",
        section: "Size & placement",
        options: { left: "Left", center: "Center", right: "Right" },
        styleSelector: "#overlay .panel",
        styleProperty: "text-align"
      },
      opacity: {
        type: "number",
        label: "Opacity (%)",
        default: 100,
        section: "Size & placement",
        min: 0,
        max: 100,
        styleSelector: "#overlay",
        styleProperty: "opacity",
        styleUnit: "%"
      },
      width: {
        type: "number",
        label: "Width (px)",
        default: 0,
        section: "Size & placement",
        min: 0,
        max: 3840,
        step: "any",
        styleSelector: "#overlay .panel",
        styleProperty: "width",
        styleValue: (settings) => (settings.width ? `${settings.width}px` : "")
      },
      nameColor: { type: "color", label: "Single name color", default: "#b9d8ff", section: "Appearance", when: ["nameMode", "fixed"] },
      messages: {
        type: "entries",
        label: "Demo messages",
        section: "Demo chat",
        default: demo,
        when: ["source", "demo"],
        validate: demoMessages,
        addLabel: "Add message",
        entries: {
          choices: platforms,
          choiceKey: "platform",
          textFields: [
            ["name", "Display name"],
            ["text", "Message", "textarea"]
          ],
          newEntry: { platform: "twitch", name: "", text: "" },
          limit: 40
        }
      },
      textColor: { type: "color", default: "#EEEEEE", label: "Text color", section: "Appearance", styleSelector: "#overlay", styleProperty: "color" },
      fontFamily: { type: "font", default: "Courier Prime", label: "Base font", section: "Appearance", maxlength: 100, styleSelector: "#overlay", styleProperty: "font-family" },
      backgroundColor: {
        type: "color",
        default: "#0000",
        label: "Panel background",
        section: "Appearance",
        styleSelector: "#overlay .panel",
        styleProperty: "background-color"
      },
      dockBg: {
        type: "select",
        default: "off",
        label: "OBS dock background",
        section: "Appearance",
        description: "Sets the page body color. Off keeps the default transparent canvas.",
        options: { off: "Off", black: "Black", dark: "Dark", white: "White", light: "Light", slate: "Slate", navy: "Navy", custom: "Custom color" },
        styleSelector: "body",
        styleProperty: "background-color",
        styleValue: ({ dockBg, dockColor }) => ({ off: "", black: "#000", dark: "#222", white: "#fff", light: "#ddd", slate: "#334155", navy: "#0f172a", custom: dockColor })[dockBg]
      },
      dockColor: { type: "color", default: "#222222", label: "Custom dock color", section: "Appearance", when: ["dockBg", "custom"] },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.textFields({
        message: ["Message", "#overlay .body"],
        name: ["Display name", "#overlay .name", ["size"]],
        identity: ["Timestamp and badges", "#overlay .identity"],
        waitingText: ["Waiting message", "#overlay .waiting"]
      }),
      ...byStream.surfaceFields({ panel: ["Panel", "#overlay .panel", ["border", "radius", "padding", "shadow"]], bubble: ["Message", "#overlay .row"] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    },
    fieldDefaults: {
      panelRadius: 0,
      panelPadding: 0,
      bubbleBackground: "#0003",
      bubbleRadius: 16,
      panelFilterShadow: "yes",
      panelFilterShadowColor: "#00000099",
      panelFilterShadowBlur: 1,
      panelFilterShadowX: 1,
      panelFilterShadowY: 1
    }
  };
  function configureResource() {
    const group = document.querySelector('form [name="source"]').closest(".accordion-body");
    const connections = document.createElement("div");
    connections.className = "d-grid gap-2 mb-2";
    for (const [id, name] of Object.entries(platforms)) {
      const row = document.createElement("div");
      row.className = "d-flex flex-wrap align-items-center gap-2 w-100 border p-2";
      row.dataset.platform = id;
      const identity = document.createElement("div");
      identity.className = "d-flex align-items-center gap-2 overflow-hidden";
      const icon = platformIcon(id);
      icon.width = icon.height = 24;
      icon.alt = "";
      icon.className = "flex-shrink-0";
      const label = document.createElement("span");
      label.className = "text-truncate";
      label.textContent = name;
      identity.append(icon, label);
      const button = document.createElement("button");
      button.type = "button";
      button.disabled = true;
      button.className = "btn btn-sm flex-shrink-0 ms-auto";
      button.style.backgroundColor = {
        twitch: "#6441a5",
        youtube: "#b91c1c",
        kick: "#53fc18",
        tiktok: "#111111"
      }[id];
      button.style.color = id === "kick" ? "#120" : "#fff";
      button.style.opacity = "1";
      button.textContent = "Connect";
      button.setAttribute("aria-label", "Connect to " + name);
      row.append(identity, button);
      connections.append(row);
    }
    const note = document.createElement("p");
    note.className = "small";
    note.textContent = "Connections are TBD. Platform authorization is unavailable.";
    group.prepend(connections, note);
  }
  // ===== OVERLAY INITIALIZATION =====
  resource.fields.messageFontSize.default = 16;
  resource.fields.nameFontSize.default = 16;
  resource.fields.identityFontSize.default = 13;
  const settings = await byStream.initResource(resource, { configureResource });
  if (!byStreamOverlay) return;
  const panel = document.querySelector("#overlay .panel");
  const waiting = document.querySelector("#overlay .waiting");
  const seen = new Set();
  const records = [];
  const formatTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  let timer;
  panel.dataset.layout = settings.layout;
  panel.dataset.flow = settings.flow;
  const badgeLabels = { mod: "Moderator", sub: "Subscriber", vip: "VIP" };

  function part(parent, className, value) {
    const node = document.createElement("span");
    node.className = className;
    node.textContent = value;
    parent.append(node);
    return node;
  }

  // ===== MESSAGE RENDERING =====
  function append(message) {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    if (seen.size > 256) seen.delete(seen.values().next().value);
    const row = document.createElement("article");
    row.className = "row";
    row.style.setProperty("--platform", colors[message.platform]);
    const identity = part(row, "identity", "");
    if (settings.showAvatars === "yes") {
      const avatar = part(identity, "avatar", Array.from(message.name.trim()).slice(0, 2).join("").toUpperCase());
      if (message.avatar) {
        const img = new Image();
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.onerror = () => img.remove();
        img.src = message.avatar;
        avatar.append(img);
      }
    }
    if (settings.showTimestamps === "yes") part(identity, "stamp", formatTime.format(message.timestamp));
    if (settings.showPlatforms === "yes") {
      const icon = platformIcon(message.platform);
      icon.classList.add("platform", message.platform);
      identity.append(icon);
    }
    if (settings.showUsernames === "yes") {
      const name = part(identity, "name", message.name);
      name.style.color = settings.nameMode === "fixed" ? settings.nameColor : settings.nameMode === "sender" && message.color ? message.color : colors[message.platform];
    }
    if (settings.showBadges === "yes") for (const badge of message.badges || []) part(identity, "badge", badgeLabels[badge]);
    if (!identity.childElementCount) identity.remove();
    part(row, "body", message.text);
    byStream.setElementVisible(waiting, false);
    if (settings.flow === "latest-last") panel.append(row);
    else panel.prepend(row);
    if (!records.length) window.byStreamResource.playEntrance?.(panel, false);
    records.push({ node: row, until: Date.now() + settings.expires * 1000 });
    while (records.length > settings.limit) removeFirst();
    byStream.enterListItem(row, settings, "bubble");
    if (settings.flow === "latest-last") panel.scrollTop = panel.scrollHeight;
    schedule();
    return true;
  }

  // ===== MESSAGE DELIVERY =====
  function removeFirst() {
    const { node } = records.shift();
    byStream.removeWithMotion(node, settings, "bubble", settings.limit, undefined, records.length ? null : panel);
  }

  function schedule() {
    clearTimeout(timer);
    if (settings.expires) {
      while (records.length && records[0].until <= Date.now()) removeFirst();
      if (records.length) timer = setTimeout(schedule, Math.max(0, records[0].until - Date.now()));
    }
    byStream.setElementVisible(waiting, records.length === 0 && settings.waiting === "yes");
  }
  function clear() {
    clearTimeout(timer);
    while (records.length) removeFirst();
    seen.clear();
    schedule();
  }

  function receive(message) {
    if (
      !message ||
      !bounded(message.id, 128) ||
      !message.id ||
      typeof message.platform !== "string" ||
      !Object.hasOwn(platforms, message.platform) ||
      !bounded(message.name, 80) ||
      !bounded(message.text, 1000) ||
      !message.text.trim() ||
      !Number.isSafeInteger(message.timestamp) ||
      message.timestamp < 0 ||
      message.timestamp > 8640000000000000 ||
      (message.color !== undefined && !(bounded(message.color, 7) && /^#[0-9a-f]{6}$/i.test(message.color))) ||
      (message.avatar !== undefined && !(bounded(message.avatar, 65536) && byStream.safeImage(message.avatar))) ||
      (message.badges !== undefined && !(Array.isArray(message.badges) && message.badges.length <= 3 && Array.from(message.badges).every((badge) => typeof badge === "string" && Object.hasOwn(badgeLabels, badge))))
    )
      return false;
    return append(message);
  }

  if (settings.source === "integration") {
    window.byStreamChat = { receive, clear };
    schedule();
  } else
    settings.messages.forEach((row, i, rows) => {
      if (row.text.trim())
        append({
          ...row,
          id: String(i),
          timestamp: Date.now() - (rows.length - i) * 15000,
          badges: i % 3 ? [] : ["sub"]
        });
    });
  window.addEventListener("pagehide", (event) => {
    clearTimeout(timer);
    if (!event.persisted) {
      panel.replaceChildren();
      records.length = 0;
      seen.clear();
      delete window.byStreamChat;
    }
  });
  window.addEventListener("pageshow", schedule);
});
