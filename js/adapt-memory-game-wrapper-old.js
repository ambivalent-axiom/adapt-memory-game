define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel',
  'core/js/logging',
  'core/js/components',
  './memory-game'
], function (Adapt, ComponentView, ComponentModel, Log, Components, MemoryGame) {
  'use strict';

  const MemoryGameView = ComponentView.extend({
    initialize: function () {
      ComponentView.prototype.initialize.apply(this, arguments);
      this._game = null;
    },

    preRender: function () {
      this.checkIfResetOnRevisit();
    },

    postRender: function () {
      this.$('.component__widget').addClass('memory-game__widget');
      this.initializeGame();
      this.setReadyStatus();

      // Check if already complete
      if (this.model.get('_isComplete')) {
        this.setCompletionStatus();
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

      // Create new instance of MemoryGame
      try {
        this._game = new MemoryGame(container, {
          cardEmojis: config.cardEmojis,
          gridSize: config.gridSize,
          theme: config.theme,
          onGameComplete: this.onGameComplete.bind(this)
        });
      } catch (error) {
        Log.error('Failed to initialize memory game:', error);
        Adapt.trigger('notify:alert', {
          title: 'Error',
          body: 'Failed to initialize memory game. Please refresh the page.'
        });
      }
    },

    onGameComplete: function () {
      // set completion status
      this.setCompletionStatus();
      this.model.set('_isComplete', true);
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
      ComponentView.prototype.remove.apply(this, arguments);
    }
  });

  return Components.register('memory-game', {
    model: ComponentModel.extend({}),
    view: MemoryGameView
  });
});
