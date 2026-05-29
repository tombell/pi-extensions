import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const VERTICAL_BORDER = "│";
const TOP_LEFT_CORNER = "┌";
const TOP_RIGHT_CORNER = "┐";
const BOTTOM_LEFT_CORNER = "└";
const BOTTOM_RIGHT_CORNER = "┘";
const LEFT_TEE = "├";
const RIGHT_TEE = "┤";

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
      const isBottom = index === innerLines.length - 1 && this.isHorizontalBorder(line);

      if (isTop) {
        return `${this.borderColor(TOP_LEFT_CORNER)}${this.fitLine(line, innerWidth, "─")}${this.borderColor(TOP_RIGHT_CORNER)}`;
      }

      if (isBottom) {
        return `${this.borderColor(BOTTOM_LEFT_CORNER)}${this.fitLine(line, innerWidth, "─")}${this.borderColor(BOTTOM_RIGHT_CORNER)}`;
      }

      if (this.isHorizontalBorder(line)) {
        return `${this.borderColor(LEFT_TEE)}${this.fitLine(line, innerWidth, "─")}${this.borderColor(RIGHT_TEE)}`;
      }

      const content = " ".repeat(contentIndent) + truncateToWidth(line, editorWidth);
      return `${this.borderColor(VERTICAL_BORDER)}${this.fitLine(content, innerWidth)}${this.borderColor(VERTICAL_BORDER)}`;
    });
  }

  private fitLine(line: string, width: number, fill = " "): string {
    const content = truncateToWidth(line, width);
    const padding = fill.repeat(Math.max(0, width - visibleWidth(content)));
    return content + this.borderColor(padding);
  }

  private isHorizontalBorder(line: string): boolean {
    // oxlint-disable-next-line no-control-regex
    const plain = line.replace(/\x1b\[[0-9;]*m/g, "").trim();
    return plain.length > 0 && /^─+$/.test(plain);
  }
}

export default function (pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setEditorComponent(
      (tui, theme, keybindings) => new EnclosedInputEditor(tui, theme, keybindings),
    );
  });
}
