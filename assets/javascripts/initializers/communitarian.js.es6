import I18n from "I18n";
import { inject as service } from "@ember/service";
import { withPluginApi } from "discourse/lib/plugin-api";
import { setDefaultHomepage } from "discourse/lib/utilities";
import TopicController from "discourse/controllers/topic";
import ResolutionController from "../controllers/resolution-controller";
import discourseComputed from "discourse-common/utils/decorators";
import { registerUnbound } from "discourse-common/lib/helpers";
import { ajax } from "discourse/lib/ajax";
import { extractError } from "discourse/lib/ajax-error";
import { gt } from "@ember/object/computed";

function initializeCommunitarian(api) {
  registerUnbound('compare', function(v1, operator, v2) {
    let operators = {
      '===': (l, r) => l === r,
      '!=': (l, r) => l != r,
      '>':  (l, r) => l >  r,
      '>=': (l, r) => l >= r,
      '<':  (l, r) => l <  r,
      '<=': (l, r) => l <= r,
    };
    return operators[operator] && operators[operator](v1, v2);
  });

  api.modifyClass("controller:navigation/categories", {
    router: service(),

    @discourseComputed("router.currentRoute.localName")
    isCommunitiesPage(currentRouteName) {
      return currentRouteName === "categories";
    },
  });

  api.modifyClass("controller:discovery:topics", {
    hasDialogs: gt("model.dialogs.length", 0)
  });

  api.modifyClassStatic("model:topic-list", {
    munge(json, store) {
      json.inserted = json.inserted || [];
      json.can_create_topic = json.topic_list.can_create_topic;
      json.more_topics_url = json.topic_list.more_topics_url;
      json.draft_key = json.topic_list.draft_key;
      json.draft_sequence = json.topic_list.draft_sequence;
      json.draft = json.topic_list.draft;
      json.for_period = json.topic_list.for_period;
      json.loaded = true;
      json.per_page = json.topic_list.per_page;
      json.topics = this.topicsFrom(store, json);
      json.dialogs = this.topicsFrom(store, json, { listKey: "dialogs" });

      if (json.topic_list.shared_drafts) {
        json.sharedDrafts = this.topicsFrom(store, json, {
          listKey: "shared_drafts"
        });
      }

      return json;
      },
  });

  api.modifyClass("controller:create-account", {
    performAccountCreation() {
      if (this.get("authOptions.email") == this.accountEmail) {
        return this._super(...arguments);
      }

      const data = {
        name: this.accountName,
        email: this.accountEmail,
        password: this.accountPassword,
        username: this.accountUsername,
        password_confirmation: this.accountHoneypot,
        challenge: this.accountChallenge,
        user_fields: this.userFields,
      };

      this.set("formSubmitted", true);
      _createAccount(data, this);
    },
  });
}

function _createAccount(data, self) {
  return ajax("/communitarian/users/new", { type: "GET", data: data })
    .then(() => {
      _createVerificationIntent(data, self);
    })
    .catch((error) => {
      self.set("formSubmitted", false);
      if (error) {
        self.flash(extractError(error), "error");
      } else {
        bootbox.alert(
          I18n.t("communitarian.verification.error_while_creating")
        );
      }
    });
}

function _createVerificationIntent(data, self) {
  return ajax("/communitarian/verification_intents", {
    type: "POST",
    data: data,
  })
    .then((response) => {
      window.location = response.verification_intent.verification_url;
    })
    .catch((error) => {
      self.set("formSubmitted", false);
      if (error) {
        self.flash(extractError(error), "error");
      } else {
        bootbox.alert(
          I18n.t("communitarian.verification.error_while_creating")
        );
      }
    });
}

function customizeTopicController() {
  TopicController.reopen(ResolutionController);
}

export default {
  name: "communitarian",

  initialize(container) {
    withPluginApi("0.8.31", initializeCommunitarian);
    const currentUser = container.lookup("current-user:main");
    if (!currentUser || !currentUser.homepage_id) setDefaultHomepage("home");
    withPluginApi("0.8.31", customizeTopicController);
  },
};
