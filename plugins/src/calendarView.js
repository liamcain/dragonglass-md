import moment from "moment";
import clsx from "clsx";

const VIEW_TYPE_CALENDAR = "calendar";

function htmlToElements(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

module.exports = () => {
  class CalendarViewType {
    constructor(view) {
      this.view = view;

      this.directory = "";
      this.format = "";

      this._openFileByName = this._openFileByName.bind(this);
      this._getMonthCalendar = this._getMonthCalendar.bind(this);
      this.update = this.update.bind(this);

      // XXX: get the daily notes dir
      // This should instead be a settings menu for the calendar view
      const dailyNotesPlugin = this.view.app.plugins
        .getEnabledPlugins()
        .find((p) => p.plugin.id === "daily-notes");

      dailyNotesPlugin.loadData().then((data) => {
        this.directory = data["folder"] || "";
        this.format = data["format"] || "YYYY-MM-DD";
      });
    }

    getViewType() {
      return VIEW_TYPE_CALENDAR;
    }

    load() {
      this.update();
    }

    getDisplayText() {
      return "Calendar";
    }

    getIcon() {
      return "calendar-with-checkmark";
    }

    getState() {}
    setState() {}
    onResize() {}
    onOpen() {}
    toggle() {}

    _getMonthCalendar() {
      const { activeLeaf } = this.view.app.workspace;
      const startDate = moment({ day: 1 });

      let calendar = `
            <table class="calendarview__table">
            <thead>
                <tr>
                <th align="center">S</th>
                <th align="center">M</th>
                <th align="center">T</th>
                <th align="center">W</th>
                <th align="center">H</th>
                <th align="center">F</th>
                <th align="center">S</th>
                </tr>
            </thead>
            <tbody>
        `;
      const today = moment().date();
      const activeFile = activeLeaf?.view.file?.path;

      let offset = startDate.isoWeekday() + 1;
      let day = 1;
      for (let weekNum = 0; weekNum <= 5; weekNum++) {
        calendar += "<tr>";
        for (let weekday = 1; weekday <= 7; weekday++) {
          const i = weekNum * 6 + weekday;
          const classes = clsx({
            "calendarview__day--today": day === today,
            "calendarview__day--active":
              `${moment({ day }).format(this.format)}.md` === activeFile,
          });
          if (i < offset || day > startDate.daysInMonth()) {
            calendar += '<td align="center"></td>';
          } else {
            calendar += `<td align="center" class="${classes}">${day}</td>`;
            day++;
          }
        }

        calendar += "</tr>";
        if (day >= startDate.daysInMonth()) {
          break;
        }
      }

      calendar += `
        </tbody>
    </table>
  `;

      return htmlToElements(calendar);
    }

    close() {}

    open(leaf) {
      this.leaf = leaf;
      this.update();
    }

    _openFileByName(filename) {
      if (!filename.endsWith(".md")) {
        filename = filename + ".md";
      }

      const { vault, workspace } = this.view.app;
      const fileObj = vault.getAbstractFileByPath(
        `${this.directory}/${filename}`
      );

      if (!fileObj) {
        // TODO: Display modal asking to create file since it doesn't exist
        return;
      }
      workspace.activeLeaf.openFile(fileObj);
    }

    update() {
      this.leaf.empty();
      const container = this.leaf.createEl("div", {
        cls: "calendarview__container",
      });
      const monthName = moment().format("MMM YYYY");
      const heading = htmlToElements(`<h2>${monthName}</h2>`);

      const table = this._getMonthCalendar();
      table.addEventListener("click", (event) => {
        const td = event.target.closest("td");
        const day = td.innerHTML;
        const selectedDate = moment({ day }).format(this.format);

        this._openFileByName(selectedDate);
      });

      container.appendChild(heading);
      container.appendChild(table);
      this.leaf.append(container);
    }
  }

  class CalendarPlugin {
    constructor() {
      this.id = "calendar-view";
      this.name = "Calendar View";
      this.description =
        "Show an interactive calendar view of your daily notes";
      this.defaultOn = true;

      this.app = null;
      this.instance = null;
    }

    init(app, instance) {
      this.app = app;
      this.instance = instance;

      this.instance.registerViewType(
        VIEW_TYPE_CALENDAR,
        (args) => new CalendarViewType(args)
      );

      this.instance.registerEvent(
        this.app.workspace.on("layout-ready", this.initLeaf.bind(this))
      );
      this.instance.registerEvent(
        this.app.workspace.on("file-open", this.refreshLeaves.bind(this))
      );
    }

    onEnable() {
      this.initLeaf();
    }

    onLoad() {}

    refreshLeaves() {
      this.app.workspace
        .getLeavesOfType(VIEW_TYPE_CALENDAR)
        .forEach((leaf) => leaf.view.update());
    }

    initLeaf() {
      if (this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR).length) {
        return;
      }
      this.app.workspace.getRightLeaf().setViewState({
        type: VIEW_TYPE_CALENDAR,
      });
    }
  }
  return new CalendarPlugin();
};
