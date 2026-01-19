import { app } from "../../scripts/app.js";
import { ComfyButtonGroup } from "../../scripts/ui/components/buttonGroup.js";
import { ComfyButton } from "../../scripts/ui/components/button.js";

const BUTTON_GROUP_CLASS = "prompt-manage-top-menu-group";
const BUTTON_TOOLTIP = "Launch PromptManage (Shift+Click opens in new window)";
const PROMPT_MANAGE_PATH = "/prompt_manage_web/index.html";
const NEW_WINDOW_FEATURES = "width=1200,height=800,resizable=yes,scrollbars=yes,status=yes";
const MAX_ATTACH_ATTEMPTS = 120;

const openPromptManage = (event) => {
    const url = `${window.location.origin}${PROMPT_MANAGE_PATH}`;

    if (event.shiftKey) {
        window.open(url, "_blank", NEW_WINDOW_FEATURES);
        return;
    }

    window.open(url, "_blank");
};

const createTopMenuButton = () => {
    const button = new ComfyButton({
        icon: "promptmanage",
        tooltip: BUTTON_TOOLTIP,
        app,
        enabled: true,
        classList: "comfyui-button comfyui-menu-mobile-collapse primary",
    });

    button.element.setAttribute("aria-label", BUTTON_TOOLTIP);
    button.element.title = BUTTON_TOOLTIP;

    if (button.iconElement) {
        button.iconElement.innerHTML = getPromptManageIcon();
        button.iconElement.style.width = "1.2rem";
        button.iconElement.style.height = "1.2rem";
    }

    button.element.addEventListener("click", openPromptManage);
    return button;
};

const attachTopMenuButton = (attempt = 0) => {
    if (document.querySelector(`.${BUTTON_GROUP_CLASS}`)) {
        return;
    }

    const settingsGroup = app.menu?.settingsGroup;
    if (!settingsGroup?.element?.parentElement) {
        if (attempt >= MAX_ATTACH_ATTEMPTS) {
            console.warn("PromptManage: unable to locate the ComfyUI settings button group.");
            return;
        }

        requestAnimationFrame(() => attachTopMenuButton(attempt + 1));
        return;
    }

    const promptManageButton = createTopMenuButton();
    const buttonGroup = new ComfyButtonGroup(promptManageButton);
    buttonGroup.element.classList.add(BUTTON_GROUP_CLASS);

    settingsGroup.element.before(buttonGroup.element);
};

const getPromptManageIcon = () => {
    return `
        <svg enable-background="new 0 0 512 512" version="1.1" viewBox="0 0 512 512" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
            <rect x="50" y="80" width="412" height="352" rx="20" ry="20" fill="none" stroke="currentColor" stroke-width="24"/>
            <path d="M 100 150 L 200 150" stroke="currentColor" stroke-width="16" stroke-linecap="round"/>
            <path d="M 100 210 L 320 210" stroke="currentColor" stroke-width="16" stroke-linecap="round"/>
            <path d="M 100 270 L 300 270" stroke="currentColor" stroke-width="16" stroke-linecap="round"/>
            <path d="M 100 330 L 280 330" stroke="currentColor" stroke-width="16" stroke-linecap="round"/>
            <circle cx="380" cy="180" r="30" fill="currentColor" opacity="0.7"/>
            <circle cx="380" cy="240" r="30" fill="currentColor" opacity="0.7"/>
            <circle cx="380" cy="300" r="30" fill="currentColor" opacity="0.7"/>
            <circle cx="380" cy="360" r="30" fill="currentColor" opacity="0.7"/>
        </svg>
    `;
};

app.registerExtension({
    name: "PromptManage.TopMenu",
    async setup() {
        attachTopMenuButton();
    },
});
