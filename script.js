// ゲームの状態を管理するオブジェクト
const gameState = {
  coins: {
    1: 4,
    5: 1,
    10: 4,
    50: 1,
    100: 4,
    500: 1,
    1000: Infinity,
  },
  subtotal: 0,
  timer: 60,
  timerInterval: null,
  totalPaidCoins: 0,
  totalChangeCoins: 0,
  numberOfPayments: 0,
  numberOfAlerts: 0,
  isModalOpen: false,
  isGameRunning: false,
  isGamePaused: false,
  isStopModalOpen: false,
};

// キーイベントのリスナーを追加
document.addEventListener('keydown', function(event) {
  if (gameState.isModalOpen || gameState.isStopModalOpen) {
    handleModalKeyEvent(event);
  } else {
    handleGameKeyEvent(event);
  }
});

// モーダルウィンドウでのキーイベント処理
function handleModalKeyEvent(event) {
  if (event.code === 'Backspace') {
    event.preventDefault();
    if (gameState.isStopModalOpen) {
      closeStopModal();
    }
    if (gameState.isModalOpen) {
      closeModal();
    }
  }
  if (event.code === 'Space') {
    event.preventDefault();
  }
  if (event.code === 'Enter') {
    event.preventDefault();
  }
}

// ゲームでのキーイベント処理
function handleGameKeyEvent(event) {
  if (gameState.isGameRunning && event.key === 'Enter') {
    pay();
  }
  if (event.code === 'Space') {
    toggleGame();
    event.preventDefault();
  }
}


// 支払いが成功したときに呼び出される関数
function incrementNumberOfPayments() {
  gameState.numberOfPayments++;
  let audio = new Audio('./audios/payment.mp3');
  audio.play();
}

// 支払いが不足している場合に呼び出される関数
function incrementNumberOfAlerts() {
  gameState.numberOfAlerts++;
}

// ゲームを開始する関数
function startGame() {
  if (gameState.isGameRunning && !gameState.isGamePaused) return;

  document.querySelectorAll(".coin, .coin-in-tray, #payment button").forEach(elem => {
    elem.removeAttribute("disabled");
    elem.style.pointerEvents = "auto";
  });

  gameState.totalPaidCoins = 0;
  gameState.totalChangeCoins = 0;

  if (!gameState.isGamePaused) {
    gameState.subtotal = getOptimalSubtotal({...gameState.coins});
    document.getElementById('amount').innerText = gameState.subtotal;
  }

  startTimer();

  gameState.isGameRunning = true;
  gameState.isGamePaused = false;
  document.getElementById('startButton').innerText = 'Game Stop';
}

// タイマーを開始する関数
function startTimer() {
  if (gameState.timerInterval) return;

  let audio = new Audio('./audios/warning.mp3');
  let timeElement = document.getElementById('time');

  gameState.timerInterval = setInterval(function() {
    gameState.timer--;
    timeElement.innerText = gameState.timer;

    if (gameState.timer <= 10) {
      timeElement.style.color = 'red';

      if (audio.paused) {
        audio.play();
      }
    } else {
      timeElement.style.color = 'var(--darkgreen)';

      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    }

    if (gameState.timer <= 0) {
      clearInterval(gameState.timerInterval);
      gameState.timerInterval = null;
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
      showModal();
    }
  }, 1000);
}

// タイマーを停止する関数
function stopTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
}

// ゲームを停止する関数
function stopGame() {
  if (!gameState.isGameRunning) return;

  stopTimer();

  gameState.isGameRunning = false;
  document.getElementById('startButton').innerText = 'Game Start';

  gameState.isGamePaused = true;
  gameState.isGameRunning = false;

  showStopModal();
}

// ゲームの開始/停止を切り替える関数
function toggleGame() {
  if (gameState.isGameRunning) {
    stopGame();
  } else {
    startGame();
  }
}

// ゲームが始まる前にコインと支払いボタンを無効にする関数
function disableBeforeStart() {
  document.querySelectorAll(".coin, .coin-in-tray, #payment button").forEach(elem => {
    elem.setAttribute("disabled", true);
    elem.style.pointerEvents = "none";
  });
  document.getElementById("startButton").removeAttribute("disabled");
  document.getElementById("startButton").style.pointerEvents = "auto";
}

// コインをトレイに移動する関数
function moveToTray(denomination) {
  if (gameState.coins[denomination] > 0) {
    gameState.coins[denomination]--;
    updateCoinCount(denomination);
    let trayCountElem = document.getElementById('trayCoin' + denomination).querySelector('.count-in-tray');
    trayCountElem.innerText = parseInt(trayCountElem.innerText) + 1;
  }
  updateTrayTotal();
}

// コインを財布に戻す関数
function moveBackToWallet(denomination) {
  let trayCountElem = document.getElementById('trayCoin' + denomination).querySelector('.count-in-tray');
  if (parseInt(trayCountElem.innerText) > 0) {
    gameState.coins[denomination]++;
    updateCoinCount(denomination);
    trayCountElem.innerText = parseInt(trayCountElem.innerText) - 1;
  }
  updateTrayTotal();
}

// 指定された額面のコインの数を更新する関数
function updateCoinCount(denomination) {
  const parentElement = document.getElementById('coin' + denomination);
  
  if (parentElement) {
    const displayElement = parentElement.querySelector('.count');
    
    if (displayElement) {
      displayElement.innerText = gameState.coins[denomination];
    } else {
      console.error("Could not find element with class 'count'.");
    }
  } else {
    console.error("Could not find element with ID 'coin" + denomination + "'.");
  }
}

// 渡されたコインオブジェクトの合計額を計算する関数
function sumCoins(coinsObj) {
  return Object.keys(coinsObj).reduce((sum, key) => sum + (coinsObj[key] * parseInt(key)), 0);
}

// トレイと財布にあるコインの可視性を更新する関数
function updateCoinVisibility() {
  const denominations = [1, 5, 10, 50, 100, 500, 1000];

  for (let denom of denominations) {
    const trayElement = document.getElementById(`trayCoin${denom}`);
    const walletElement = document.getElementById(`coin${denom}`);
    const trayCount = parseInt(trayElement.querySelector('.count-in-tray').innerText);
    const walletCount = gameState.coins[denom];

    trayElement.classList.toggle('no-image', trayCount === 0);
    walletElement.classList.toggle('no-image', walletCount === 0);
  }
}

// 支払いを行う関数
function pay() {
  let paymentCoins = {};
  const denominations = [1, 5, 10, 50, 100, 500, 1000];
  
  for (let denom of denominations) {
    paymentCoins[denom] = parseInt(document.getElementById(`trayCoin${denom}`).querySelector('.count-in-tray').innerText);
  }

  const paymentTotalValue = sumCoins(paymentCoins);
  const paymentTotal = Object.values(paymentCoins).reduce((a, b) => a + b, 0);

  if (paymentTotalValue < gameState.subtotal) {
    let audio = new Audio('./audios/wrong.mp3');
    audio.play();

    incrementNumberOfAlerts();
    
    return;
  }

  const change = paymentTotalValue - gameState.subtotal;
  const changeCoins = getOptimalChange(change);
  const changeTotal = Object.values(changeCoins).reduce((a, b) => a + b, 0);

  gameState.totalPaidCoins += paymentTotal;
  gameState.totalChangeCoins += changeTotal;

  for (const denom in changeCoins) {
    gameState.coins[denom] += changeCoins[denom];
    updateCoinCount(denom);
  }

  for (const denom of denominations) {
    document.getElementById(`trayCoin${denom}`).querySelector('.count-in-tray').innerText = '0';
  }

  const timeAdjustment = (paymentTotal - changeTotal) * 3;
  gameState.timer += timeAdjustment;
  if (gameState.timer < 0) gameState.timer = 0;
  document.getElementById('time').innerText = gameState.timer;

  incrementNumberOfPayments();
  generateNewSubtotal();
  updateTrayTotal();
  updateCoinCount();
}

// 与えられた額に対して最適なおつりを計算する関数
function getOptimalChange(change) {
  let denominations = [1000, 500, 100, 50, 10, 5, 1];
  let result = {};

  for (let denom of denominations) {
      result[denom] = Math.floor(change / denom);
      change = change % denom;
  }

  return result;
}

// 新しい小計を生成する関数
function generateNewSubtotal() {
  gameState.subtotal = Math.floor(Math.random() * 2000);
  document.getElementById('amount').innerText = gameState.subtotal;
}

// おつりの額を更新する関数
function updateChangeAmount() {
  const totalInTray = parseInt(document.getElementById('totalInTray').innerText);
  let changeAmount = totalInTray - gameState.subtotal;

  if (totalInTray >= gameState.subtotal) {
      document.getElementById('change-amount').innerText = `${changeAmount}円`;
  } else {
    document.getElementById('change-amount').innerText = "";
  }
}

// トレイ内のコイン合計を更新する関数
function updateTrayTotal() {
  let total = sumCoins({
      1: parseInt(document.getElementById('trayCoin1').querySelector('.count-in-tray').innerText),
      5: parseInt(document.getElementById('trayCoin5').querySelector('.count-in-tray').innerText),
      10: parseInt(document.getElementById('trayCoin10').querySelector('.count-in-tray').innerText),
      50: parseInt(document.getElementById('trayCoin50').querySelector('.count-in-tray').innerText),
      100: parseInt(document.getElementById('trayCoin100').querySelector('.count-in-tray').innerText),
      500: parseInt(document.getElementById('trayCoin500').querySelector('.count-in-tray').innerText),
      1000: parseInt(document.getElementById('trayCoin1000').querySelector('.count-in-tray').innerText)
  });
  document.getElementById('totalInTray').innerText = total;

  updateCoinVisibility();
  updateChangeAmount();
}

// 最適な小計を計算する関数
function getOptimalSubtotal() {
  let currentCoinsCount = gameState.coins[1] + gameState.coins[5] + gameState.coins[10] + gameState.coins[50] + gameState.coins[100] + gameState.coins[500];
  let targetCoinsCount = Math.floor(Math.random() * 6) + 20;
  let difference = targetCoinsCount - currentCoinsCount;

  let subtotal = 0;
  let denominations = [500, 100, 50, 10, 5, 1];
  let tempCoins = {...gameState.coins};

  for (let denom of denominations) {
      while (difference > 0 && tempCoins[denom] > 0) {
          subtotal += denom;
          difference--;
          tempCoins[denom]--;
      }
  }

  gameState.subtotal = subtotal;
  return subtotal;
}

// ゲームのスコアを計算する関数
function calculateScore() {
  const w_N = 10;
  const w_C = 50;
  const w_A = 20;

  const totalCoins = gameState.totalPaidCoins + gameState.totalChangeCoins;
  const C_over_T = totalCoins !== 0 ? gameState.totalChangeCoins / totalCoins : 0;

  const score = w_N * gameState.numberOfPayments - w_C * C_over_T - w_A * gameState.numberOfAlerts;

  return Math.round(score);
}

// ゲーム終了時にモーダルウィンドウを表示する関数
function showModal() {
  gameState.isModalOpen = true;
  const score = calculateScore();
  let rank = "";

  if (score < 100) {
    rank = "子ども";
  } else if (score >= 100 && score < 200) {
    rank = "学生";
  } else if (score >= 200 && score < 400) {
    rank = "凡人";
  } else if (score >= 400 && score < 500) {
    rank = "秀才";
  } else {
    rank = "天才";
  }

  document.getElementById("details-section").style.display = "none";
  document.getElementById('score').innerText = score;
  document.getElementById('rank').innerText = rank;
  document.getElementById('totalPaidCoins').innerText = gameState.totalPaidCoins;
  document.getElementById('totalChangeCoins').innerText = gameState.totalChangeCoins;
  document.getElementById('numberOfPayments').innerText = gameState.numberOfPayments;
  document.getElementById('numberOfAlerts').innerText = gameState.numberOfAlerts;
  document.getElementById("scoreModal").style.display = "block";
}

// 詳細を表示/非表示にする関数
function showDetails() {
  const detailsSection = document.getElementById("details-section");
  if (detailsSection.style.display === "none") {
    detailsSection.style.display = "block";
  } else {
    detailsSection.style.display = "none";
  }
}

// 詳細ボタンの表示を切り替える関数
function toggleDetails() {
  const detailsSection = document.getElementById("details-section");
  const detailsButton = document.getElementById("detailsButton");

  if (detailsSection.style.display === "none") {
    detailsSection.style.display = "block";
    detailsButton.innerText = "閉じる";
  } else {
    detailsSection.style.display = "none";
    detailsButton.innerText = "詳細";
  }
}

// スコアモーダルを閉じてゲームをリセットする関数
function closeModal() {
  gameState.isModalOpen = false;
  const modal = document.getElementById("scoreModal");
  modal.style.display = "none";

  document.getElementById('time').style.color = 'var(--darkgreen)';
  
  resetGame();
  
  disableBeforeStart();

  document.getElementById('startButton').innerText = 'Game Start';
  gameState.isGameRunning = false;
}

// ゲーム状態をリセットする関数
function resetGame() {
  gameState.totalPaidCoins = 0;
  gameState.totalChangeCoins = 0;
  clearInterval(gameState.timerInterval);
  gameState.timer = 60;
  gameState.timerInterval = null;
  document.getElementById('time').innerText = gameState.timer;
  document.getElementById('amount').innerText = '';
  document.getElementById('change-amount').innerText = '';
  document.getElementById('totalInTray').innerText = '0';
  
  gameState.coins = {
    1: 4,
    5: 1,
    10: 4,
    50: 1,
    100: 4,
    500: 1,
    1000: Infinity
  };
  
  for (let denom in gameState.coins) {
    document.getElementById('trayCoin' + denom).querySelector('.count-in-tray').innerText = '0';
    document.getElementById('coin' + denom).querySelector('.count').innerText = gameState.coins[denom];
  }

  gameState.numberOfPayments = 0;
  gameState.numberOfAlerts = 0;

  document.getElementById('time').style.color = 'var(--darkgreen)';

  updateCoinVisibility();
  disableBeforeStart();
}

// ページが読み込まれたときにゲームをリセットする
window.onload = function() {
  resetGame();
  disableBeforeStart();
};

// ゲームが一時停止したときに表示されるモーダルを表示する関数
function showStopModal() {
  document.getElementById("stopModal").style.display = "block";
  gameState.isStopModalOpen = true;
  stopTimer();
}


// ゲームが一時停止したときのモーダルを閉じる関数
function closeStopModal() {
  document.getElementById("stopModal").style.display = "none";
  document.getElementById('startButton').innerText = 'Game Stop';
  gameState.isStopModalOpen = false;
  gameState.isGameRunning = false;
  startGame();
}