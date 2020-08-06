import I18n from "I18n";
import Controller from "@ember/controller";
import discourseComputed, { observes } from "discourse-common/utils/decorators";
import EmberObject from "@ember/object";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { throttle } from "@ember/runloop";

export default Controller.extend({
  init() {
    this._super(...arguments);
    this._setupPoll();
  },

  @discourseComputed("pollOptions")
  pollOptionsCount(pollOptions) {
    const notEmpty = Boolean;
    return pollOptions.split("\n").filter(notEmpty).length;
  },

  @discourseComputed("pollOutput", "title")
  previewText(pollOptions, title) {
    let output = "";

    if (title.length > 0) output += `${title}\n`;

    output += this.pollOutput;

    return output;
  },

  @discourseComputed("pollOptions")
  pollOutput(pollOptions) {
    let pollHeader = "[poll type=regular results=always chartType=bar";
    let output = "";

    pollHeader += ` close=${this._closeDate().toISOString()}`;
    pollHeader += "]";

    output += `${pollHeader}\n`;
    output += this._parsedPollOptions(pollOptions);
    output += "[/poll]\n";

    return output;
  },

  @discourseComputed("pollOptionsCount")
  minNumOfOptionsValidation(count) {
    let options = { ok: true };

    if (count < 1) {
      options = {
        failed: true,
        reason: I18n.t("communitarian.resolution.ui_builder.help.options_count")
      };
    }

    return EmberObject.create(options);
  },

  @discourseComputed("title")
  titleMaxLengthValidation(title) {
    let options = { ok: true };

    if (title.length > this.siteSettings.max_topic_title_length) {
      options = {
        failed: true,
        reason: I18n.t("composer.error.title_too_long", { max: this.siteSettings.max_topic_title_length })
      };
    }

    return EmberObject.create(options);
  },

  @discourseComputed("pollOptionsCount", "title", "loading")
  disabledButton(pollOptionsCount, title, loading) {
    return loading ||
           pollOptionsCount < 1 ||
           title.length > this.siteSettings.max_topic_title_length;
  },

  @observes("title", "pollOptions")
  typing() {
    throttle(
      this,
      function() {
        const typingTime = this.typingTime || 0;
        this.set("typingTime", typingTime + 100);
      },
      100,
      false
    );
  },

  _setupPoll() {
    this.setProperties({
      title: "",
      pollOptions: "",
      titleMaxLength: this.siteSettings.max_topic_title_length,
      loading: false,
      typingTime: 0,
      firstOpenedTimestamp: new Date(),
      category: window.location.pathname.match(/c\/.*\/(.*)$/)[1],
      autoCloseReminder: this._autoCloseReminderText(),
      activePerionNote: I18n.t("communitarian.resolution.ui_builder.active_perion_note")
    });
  },

  _autoCloseReminderText() {
    const closeDate = this._closeDate().format("MMM D, ha");
    return I18n.t("communitarian.resolution.ui_builder.auto_close_reminder", { close_date: closeDate })
  },

  _closeDate() {
    let closeDate = moment.tz("America/New_York").set({ hours: 17, minutes: 0, seconds: 0, millisecond: 0 });
    const currentWeekday = closeDate.weekday();
    const closeWeekDay = 6;
    const isWeekEnd = (weekday) => weekday == 0 || weekday == 6;

    // choose next saturday if current work week has been finished
    if (isWeekEnd(currentWeekday)) closeDate.add(1, "week");

    closeDate.isoWeekday(closeWeekDay);

    return closeDate;
  },

  _parsedPollOptions(pollOptions) {
    let output = "";

    if (pollOptions.length > 0) {
      pollOptions.split("\n").forEach(option => {
        if (option.length !== 0) output += `* ${option}\n`;
      });
      output += `* ${I18n.t("communitarian.resolution.ui_builder.poll_options.close_option")}\n`
    }

    return output;
  },

  actions: {
    createResolution() {
      if (this.disabledButton || this.loading) {
        return;
      }

      const totalOpenDuration = new Date() - this.firstOpenedTimestamp;

      this.set("loading", true);

      return ajax("/communitarian/resolutions", {
        type: "POST",
        data: {
          title: this.title,
          raw: this.pollOutput,
          category: this.category,
          typing_duration_msecs: this.typingTime,
          composer_open_duration_msecs: totalOpenDuration
        }
      })
        .then(response => {
          window.location = `/t/topic/${response.post.topic_id}`;
        })
        .catch(error => {
          this.set("loading", false);
          if (error) {
            popupAjaxError(error);
          } else {
            bootbox.alert(I18n.t("communitarian.resolution.error_while_creating"));
          }
        });
    }
  }
});