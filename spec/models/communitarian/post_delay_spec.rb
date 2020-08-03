# frozen_string_literal: true

require "rails_helper"

RSpec.describe Communitarian::PostDelay, type: :model do
  describe ".call" do
    subject(:result) { Communitarian::PostDelay.call(manager) }

    let(:manager) { NewPostManager.new(user, topic_id: 1) }
    let(:user) { mock("user") }

    context "when user posted recently" do
      before { user.stubs(:posted_recently?).returns(true) }

      it "creates an error" do
        expect(result.errors).to have_attributes(
          full_messages: include("You can't post more than once in 5 minutes in this topic")
        )
      end
    end

    context "when user has no recent posts" do
      before { user.stubs(:posted_recently?).returns(false) }

      it "does nothing" do
        expect(result).to be_nil
      end
    end
  end
end
