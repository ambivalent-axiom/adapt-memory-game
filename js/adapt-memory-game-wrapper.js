define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel',
  'core/js/components',
  './associative-memory-game'
], function (Adapt, ComponentView, ComponentModel, Components, AssociativeMemoryGame) {
  'use strict';

  const MemoryGameView = ComponentView.extend({
    events: {
      'click .memory-game-start': 'onStartClick',
      'click .memory-game-modal__close': 'closeModal'
    },

    initialize: function () {
      ComponentView.prototype.initialize.apply(this, arguments);
      this._game = null;
      // Only bind to resize event if the game supports resizing
      this.listenTo(Adapt, 'device:resize', this.onScreenSizeChanged);
    },

    preRender: function () {
      this.checkIfResetOnRevisit();
    },

    postRender: function () {
      this.$('.component__widget').addClass('memory-game__widget');

      this.$el.removeClass('u-visibility-hidden'); // remove the hidden visibility class

      if (this.model.get('_isModal')) {
        this.$el.addClass('memory-game--modal-enabled');
        this.setReadyStatus();
      } else {
        this.initializeGame();
        this.setReadyStatus();
      }

      if (this.model.get('_isComplete')) {
        this.setCompletionStatus();
      }
    },

    onStartClick: function() {
      if (!this.model.get('_isModal')) return;
      this.openModal();
    },

    openModal: function() {
      $('body').addClass('memory-game-modal-open');
      this.$('.memory-game-modal').addClass('is-open');

      if (!this._game) {
        this.initializeGame();
      }
    },

    closeModal: function() {
      $('body').removeClass('memory-game-modal-open');
      this.$('.memory-game-modal').removeClass('is-open');
    },

    onScreenSizeChanged: function() {
      // Instead of calling resize directly, reinitialize the game
      if (this._game) {
        // Store game state if needed
        const wasComplete = this.model.get('_isComplete');

        // Cleanup existing game
        this._game.cleanup();
        this._game = null;

        // Reinitialize with same configuration
        this.initializeGame();

        // Restore completion state if needed
        if (wasComplete) {
          this.setCompletionStatus();
          this.model.set('_isComplete', true);
        }
      }
    },

    initializeGame: function () {
      const config = this.model.get('_memory-game');
      if (!config) {
        throw new Error('Memory game configuration not found');
      }

      const container = this.$('.memory-game-container')[0];
      if (!container) {
        throw new Error('Memory game container element not found');
      }

      try {
        this._game = new AssociativeMemoryGame(container, config);
      } catch (error) {
        Adapt.trigger('notify:alert', {
          title: 'Error',
          body: 'Failed to initialize memory game. Please refresh the page.'
        });
      }
    },

    onGameComplete: function () {
      this.setCompletionStatus();
      this.model.set('_isComplete', true);

      if (this.model.get('_isModal')) {
        setTimeout(() => this.closeModal(), 1000);
      }
    },

    checkIfResetOnRevisit: function () {
      const isResetOnRevisit = this.model.get('_isResetOnRevisit');
      if (isResetOnRevisit) {
        this.model.reset('soft');
      }
    },

    remove: function () {
      if (this._game) {
        this._game.cleanup();
        this._game = null;
      }
      this.closeModal();
      ComponentView.prototype.remove.apply(this, arguments);
    }
  });

  return Components.register('memory-game', {
    model: ComponentModel.extend({
      defaults: function() {
        return {
          _isModal: false
        };
      }
    }),
    view: MemoryGameView
  });
});
