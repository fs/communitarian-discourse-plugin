import I18n from "I18n";
import { computed } from "@ember/object";
import { setting } from "discourse/lib/computed";
import showModal from "discourse/lib/show-modal";
import DropdownSelectBox from "select-kit/components/dropdown-select-box";

export default DropdownSelectBox.extend({
  classNames: ["new-dropdown", "categories-admin-dropdown"],

  selectKitOptions: {
    icon: null,
    showCaret: true,
    none: "communitarian.community.new_button",
  },

  content: computed(function() {
    const items = [];

    items.push({
      id: "createResolution",
      name: I18n.t("communitarian.resolution.new_button"),
      icon: "list"
    });

    const allowedToCreateTopic = !this.get("createTopicButtonDisabled") || this.get("canCreateTopic") || !this.get("createTopicDisabled");

    if (allowedToCreateTopic) {
      items.push({
        id: "createDialog",
        name: I18n.t("communitarian.dialog.new_button"),
        icon: "comment"
      });
    }

    return items;
  }),

  createResolution() {
    showModal("resolution-ui-builder")._setupPoll();
  },

  createDialog() {
    const dNavigation = this.parentView;
    dNavigation.actions.clickCreateTopicButton.call(dNavigation);
  },

  actions: {
    onChange(action) {
      this[action]();
    }
  }
});
