import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const VERTICAL_BORDER = "│";
const TOP_LEFT_CORNER = "┌";
const TOP_RIGHT_CORNER = "┐";
const BOTTOM_LEFT_CORNER = "└";
const BOTTOM_RIGHT_CORNER = "┘";

class EnclosedInputEditor extends CustomEditor {
  render(width: number): string[] {
    if (width < 3) {
      return super.render(width);
    }

    const innerWidth = width - 2;
    const contentIndent = 1;
    const editorWidth = Math.max(1, innerWidth - contentIndent);
    const innerLines = super.render(editorWidth);

    return innerLines.map((line, index) => {
      const isTop = index === 0;
      const isBottom = index === innerLines.length - 1;
      const content = truncateToWidth(line, innerWidth);
      const padded = content + " ".repeat(Math.max(0, innerWidth - visibleWidth(content)));

      if (isTop) {
        return `${this.borderColor(TOP_LEFT_CORNER)}${padded}${this.borderColor(TOP_RIGHT_CORNER)}`;
      }

      if (isBottom) {
        return `${this.borderColor(BOTTOM_LEFT_CORNER)}${padded}${this.borderColor(BOTTOM_RIGHT_CORNER)}`;
      }

      const sideContent = " ".repeat(contentIndent) + truncateToWidth(line, editorWidth);
      const sidePadded =
        sideContent + " ".repeat(Math.max(0, innerWidth - visibleWidth(sideContent)));
      return `${this.borderColor(VERTICAL_BORDER)}${sidePadded}${this.borderColor(VERTICAL_BORDER)}`;
    });
  }
}

export default function (pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setEditorComponent(
      (tui, theme, keybindings) => new EnclosedInputEditor(tui, theme, keybindings),
    );
  });
}
