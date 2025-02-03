define(function () {
  'use strict';

  class AssociativeMemoryGame {
    constructor(container, config = {}) {
      this.onGameComplete = config.onGameComplete || (() => {});
      this.container = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      this.config = {
        // Each pair contains SVG content and its matching text
        cardPairs: config.cardPairs || [
          {
            svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>',
            text: 'Circle'
          },
          {
            svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" fill="currentColor"/></svg>',
            text: 'Square'
          },
          {
            svg: '<svg viewBox="0 0 24 24"><polygon points="12,2 22,22 2,22" fill="currentColor"/></svg>',
            text: 'Triangle'
          },
          {
            svg: '<svg viewBox="0 0 24 24"><path d="M12,2 L2,22 L22,22 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
            text: 'Outline'
          }
        ],
        movesText: config.movesText || 'Moves',
        winMsg: config.winMessage || 'Congratulations! You won!',
        gridSize: config.gridSize || 4,
        theme: {
          primary: config.theme?.primary || '#007bff',
          secondary: config.theme?.secondary || '#6c757d',
          background: config.theme?.background || '#ffffff',
          highlight: config.theme?.highlight || '#28a745'
        },
        sounds: {
          flip: config.flipSound || '../assets/flipcard.mp3',
          match: config.matchSound || '../assets/success.mp3',
          win: config.winSound || '../assets/win.mp3'
        }
      };

      this.winSound = new Audio(this.config.sounds.win);
      this.flipSound = new Audio(this.config.sounds.flip);
      this.matchSound = new Audio(this.config.sounds.match);
      this.cards = [];
      this.flippedCards = [];
      this.matchedCards = [];
      this.moves = 0;
      this.isLocked = false;
      this.gameStatus = 'playing';
      this.initialize();
    }

    initialize() {
      this.createGameContainer();
      this.createCards();
      this.createStatusBar();
      this.attachEventListeners();
    }

    createGameContainer() {
      this.container.innerHTML = '';
      this.container.style.maxWidth = '800px'; // Increased for better text readability
      this.container.style.margin = 'auto';
      this.container.style.marginTop = '1rem';
      this.container.style.padding = '1rem';

      this.gameBoard = document.createElement('div');
      this.gameBoard.style.display = 'grid';
      this.gameBoard.style.gridTemplateColumns = `repeat(${this.config.gridSize}, 1fr)`;
      this.gameBoard.style.gap = '1rem';
      this.container.appendChild(this.gameBoard);
    }

    createCards() {
      // Create array of all cards (SVGs and text)
      const allCards = this.config.cardPairs.flatMap(pair => [
        { type: 'svg', content: pair.svg, matchId: pair.text },
        { type: 'text', content: pair.text, matchId: pair.text }
      ]);

      this.cards = this.shuffleArray(allCards).map((card, id) => ({
        id,
        ...card,
        isFlipped: false,
        isMatched: false
      }));

      this.cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'memory-card';
        cardElement.dataset.id = card.id;
        cardElement.style.aspectRatio = '1';
        cardElement.style.backgroundColor = this.config.theme.secondary;
        cardElement.style.borderRadius = '8px';
        cardElement.style.cursor = 'pointer';
        cardElement.style.display = 'flex';
        cardElement.style.justifyContent = 'center';
        cardElement.style.alignItems = 'center';
        cardElement.style.transition = 'transform 0.3s';
        cardElement.style.transform = 'rotateY(180deg)';

        const content = document.createElement('div');
        if (card.type === 'svg') {
          content.style.width = '60%';
          content.style.height = '60%';
          content.innerHTML = card.content;
          content.querySelector('svg').style.color = this.config.theme.primary;
        } else {
          content.textContent = card.content;
          content.style.fontSize = '1.2rem';
          content.style.padding = '0.5rem';
          content.style.textAlign = 'center';
        }
        content.style.display = 'none';

        cardElement.appendChild(content);
        this.gameBoard.appendChild(cardElement);
      });
    }

    checkMatch() {
      const [firstId, secondId] = this.flippedCards;
      const firstCard = this.cards[firstId];
      const secondCard = this.cards[secondId];

      if (firstCard.matchId === secondCard.matchId) {
        // Play match sound
        this.matchSound.currentTime = 0;
        this.matchSound.play().catch(e => console.log('Audio playback failed:', e));
        this.matchedCards.push(firstId, secondId);
        this.isLocked = false;
        this.checkWin();
      } else {
        setTimeout(() => {
          this.unflipCard(firstId);
          this.unflipCard(secondId);
          this.isLocked = false;
        }, 1000);
      }

      this.flippedCards = [];
    }

    // Rest of the methods remain the same as the original MemoryGame class
    createStatusBar() {
      this.statusBar = document.createElement('div');
      this.statusBar.style.marginBottom = '1rem';
      this.statusBar.style.display = 'flex';
      this.statusBar.style.justifyContent = 'space-between';
      this.statusBar.style.alignItems = 'center';

      const movesDisplay = document.createElement('div');
      movesDisplay.textContent = `${this.config.movesText}: ${this.moves}`;
      this.movesDisplay = movesDisplay;

      // const resetButton = document.createElement('button');
      // resetButton.textContent = 'Reset Game';
      // resetButton.style.padding = '0.5rem 1rem';
      // resetButton.style.backgroundColor = this.config.theme.primary;
      // resetButton.style.color = 'white';
      // resetButton.style.border = 'none';
      // resetButton.style.borderRadius = '4px';
      // resetButton.style.cursor = 'pointer';
      // resetButton.onclick = () => this.resetGame();

      this.statusBar.appendChild(movesDisplay);
      // this.statusBar.appendChild(resetButton);
      this.container.insertBefore(this.statusBar, this.gameBoard);
    }

    attachEventListeners() {
      this.gameBoard.addEventListener('click', (e) => {
        const cardElement = e.target.closest('.memory-card');
        if (cardElement) {
          const cardId = parseInt(cardElement.dataset.id);
          this.handleCardClick(cardId, cardElement);
        }
      });
    }

    handleCardClick(cardId, cardElement) {
      if (
        this.isLocked ||
        this.gameStatus === 'won' ||
        this.flippedCards.includes(cardId) ||
        this.matchedCards.includes(cardId)
      ) {
        return;
      }

      this.flipCard(cardId, cardElement);
      this.flippedCards.push(cardId);
      this.moves++;
      this.movesDisplay.textContent = `${this.config.movesText}: ${this.moves}`;

      if (this.flippedCards.length === 2) {
        this.isLocked = true;
        this.checkMatch();
      }
    }

    flipCard(cardId, cardElement) {
      const content = cardElement.querySelector('div');
      cardElement.style.transform = 'rotateY(0deg)';
      cardElement.style.backgroundColor = this.config.theme.background;
      content.style.display = 'flex';
      // Play flip sound
      this.flipSound.currentTime = 0;
      this.flipSound.play().catch(e => console.log('Audio playback failed:', e));
    }

    unflipCard(cardId) {
      const cardElement = this.gameBoard.querySelector(`[data-id="${cardId}"]`);
      const content = cardElement.querySelector('div');
      cardElement.style.transform = 'rotateY(180deg)';
      cardElement.style.backgroundColor = this.config.theme.secondary;
      content.style.display = 'none';
    }

    checkWin() {
      if (this.matchedCards.length === this.cards.length) {
        // Play win sound
        this.winSound.currentTime = 0;
        this.winSound.play().catch(e => console.log('Audio playback failed:', e));
        this.gameStatus = 'won';
        this.showWinMessage();
      }
    }

    showWinMessage() {
      const winMessage = document.createElement('div');
      winMessage.style.marginTop = '1rem';
      winMessage.style.textAlign = 'center';
      winMessage.style.color = this.config.theme.highlight;
      winMessage.textContent = this.config.winMsg;
      this.container.appendChild(winMessage);
      this.onGameComplete();
    }

    resetGame() {
      this.flippedCards = [];
      this.matchedCards = [];
      this.moves = 0;
      this.isLocked = false;
      this.gameStatus = 'playing';
      this.movesDisplay.textContent = `${this.config.movesText}: ${this.moves}`;

      const winMessage = this.container.querySelector('div:last-child');
      if (winMessage) { winMessage.remove(); }

      const cardElements = this.gameBoard.querySelectorAll('.memory-card');
      cardElements.forEach((card) => {
        const content = card.querySelector('div');
        card.style.transform = 'rotateY(180deg)';
        card.style.backgroundColor = this.config.theme.secondary;
        content.style.display = 'none';
      });

      this.cards = this.shuffleArray(this.cards);
      cardElements.forEach((card, index) => {
        card.dataset.id = this.cards[index].id;
        const content = card.querySelector('div');
        if (this.cards[index].type === 'svg') {
          content.innerHTML = this.cards[index].content;
          content.style.width = '60%';
          content.style.height = '60%';
          content.style.fontSize = '';
          content.style.padding = '';
          content.querySelector('svg').style.color = this.config.theme.primary;
        } else {
          content.textContent = this.cards[index].content;
          content.style.width = '';
          content.style.height = '';
          content.style.fontSize = '1.2rem';
          content.style.padding = '0.5rem';
        }
      });
    }

    shuffleArray(array) {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    }

    handleResize(containerWidth) {
      const cardSize = Math.floor(
        (containerWidth - (this.config.gridSize - 1) * 16) /
          this.config.gridSize
      );
      const cards = this.gameBoard.querySelectorAll('.memory-card');
      cards.forEach((card) => {
        card.style.width = cardSize + 'px';
        card.style.height = cardSize + 'px';
      });
    }

    cleanup() {
      if (this.gameBoard) {
        this.gameBoard.removeEventListener('click', this._handleClick);
      }
      if (this._flipTimer) {
        clearTimeout(this._flipTimer);
      }
      this.flipSound = null;
      this.matchSound = null;
      this.container = null;
      this.gameBoard = null;
      this.statusBar = null;
      this.movesDisplay = null;
      this.cards = [];
      this.flippedCards = [];
      this.matchedCards = [];
    }
  }

  return AssociativeMemoryGame;
});
