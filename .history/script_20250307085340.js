
// Game configuration
const config = {
    rows: 20,                // Increased from 16 to 20 rows for taller board
    pegsStartCount: 3,       // Start with 3 pegs at the top row
    ballSpeed: 0.5,
    gravity: 0.15,
    friction: 0.99,
    pegInfluence: 0.6,
    maxActiveBalls: 10,
    // Updated multipliers to match the image exactly
    multipliers: [1000, 100, 10, 5, 2, 1, 0.7, 0.2, 0.2, 0.2, 0.7, 1, 2, 5, 26, 130, 1000],
    horizontalSpacingFactor: 1.6
};

let balance = 1000;
let totalProfit = 0;
let totalLoss = 0;
let ballPrice = 30;
let activeBalls = [];
let pegLayout = [];

// Initialize the board
function initializeBoard() {
    const board = document.getElementById('plinkoBoard');
    const boardWidth = board.clientWidth;
    const boardHeight = board.clientHeight;
    
    // Calculate peg spacing for the wider triangular pattern
    const horizontalSpacing = (boardWidth / (config.rows + 1)) * config.horizontalSpacingFactor;
    const verticalSpacing = (boardHeight - 80) / (config.rows);
    
    // Create pegs in a triangular pattern with progressive row lengths
    for (let row = 0; row < config.rows; row++) {
        // Calculate number of pegs in this row (increase by 1 for each row, starting with config.pegsStartCount)
        const pegsInRow = config.pegsStartCount + row;
        
        // Calculate the starting position for the first peg in the row
        const rowStartX = boardWidth / 2 - (horizontalSpacing * (pegsInRow - 1)) / 2;
        
        for (let col = 0; col < pegsInRow; col++) {
            const peg = document.createElement('div');
            peg.className = 'peg';
            
            // Add some highlight pegs (red pegs)
            if (Math.random() < 0.2) {
                peg.classList.add('highlight-peg');
            }
            
            // Calculate position for evenly distributed pegs
            const offsetX = rowStartX + col * horizontalSpacing;
            const offsetY = verticalSpacing * row + 50;
            
            peg.style.left = `${offsetX}px`;
            peg.style.top = `${offsetY}px`;
            
            board.appendChild(peg);
            
            // Store peg position for collision detection
            pegLayout.push({
                x: offsetX,
                y: offsetY,
                highlight: peg.classList.contains('highlight-peg'),
                element: peg
            });
        }
    }
    
    // Create buckets - FIXED VERSION
    const buckets = document.createElement('div');
    buckets.className = 'buckets';
    
    // Get the last row of pegs to align buckets with
    const lastRowPegs = pegLayout.slice(-config.pegsStartCount - config.rows + 1);
    const leftmostPeg = lastRowPegs[0].x;
    const rightmostPeg = lastRowPegs[lastRowPegs.length - 1].x;
    const bucketAreaWidth = rightmostPeg - leftmostPeg;
    
    // Define colors for buckets based on multipliers
    const getColorForMultiplier = (multiplier) => {
        if (multiplier >= 100) return '#e74c3c';      // Red for highest multipliers
        if (multiplier >= 10) return '#e67e22';       // Orange for high multipliers
        if (multiplier >= 2) return '#f1c40f';        // Yellow for medium multipliers
        return '#f39c12';                             // Gold for low multipliers
    };

    // Set the buckets container width to match the width of the last row of pegs
    buckets.style.width = `${bucketAreaWidth}px`;
    buckets.style.left = `${leftmostPeg}px`;
    buckets.style.position = 'absolute';

    // Add bucket divs to match the multipliers
    const multiplierCount = config.multipliers.length;
    const bucketWidth = bucketAreaWidth / multiplierCount;
    
    for (let i = 0; i < multiplierCount; i++) {
        const bucket = document.createElement('div');
        bucket.className = 'bucket';
        bucket.style.backgroundColor = getColorForMultiplier(config.multipliers[i]);
        bucket.textContent = `${config.multipliers[i]}x`;
        bucket.style.width = `${bucketWidth}px`;
        buckets.appendChild(bucket);
    }
    
    board.appendChild(buckets);
}

// Create a falling ball animation
function showBallDropAnimation() {
    return new Promise(resolve => {
        const board = document.getElementById('plinkoBoard');
        const fallingBall = document.createElement('div');
        fallingBall.className = 'falling-ball-animation';
        board.appendChild(fallingBall);
        
        setTimeout(() => {
            fallingBall.remove();
            resolve();
        }, 500);
    });
}

// Create a ball and start animation
async function dropBall() {
    const currentBallPrice = parseInt(document.getElementById('ballPrice').value);
    if (balance < currentBallPrice) {
        document.getElementById('results').textContent = "Not enough balance!";
        setTimeout(() => {
            document.getElementById('results').textContent = "";
        }, 2000);
        return;
    }
    
    // Check if we've reached the maximum number of active balls
    if (activeBalls.length >= config.maxActiveBalls) {
        document.getElementById('results').textContent = "Too many balls in play!";
        setTimeout(() => {
            document.getElementById('results').textContent = "";
        }, 2000);
        return;
    }
    
    // Deduct ball price from balance
    balance -= currentBallPrice;
    document.getElementById('balance').textContent = balance;
    
    // Show the ball drop animation
    await showBallDropAnimation();
    
    const board = document.getElementById('plinkoBoard');
    const boardWidth = board.clientWidth;
    
    // Ball starts at the top center of the board
    const ball = document.createElement('div');
    ball.className = 'ball';
    ball.style.left = `${boardWidth / 2}px`;
    ball.style.top = '20px';
    board.appendChild(ball);
    
    // Create a new ball object
    const newBall = {
        element: ball,
        id: Date.now(),
        x: boardWidth / 2,
        y: 20,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1,
        radius: 8,
        price: currentBallPrice
    };
    
    // Add ball to active balls array
    activeBalls.push(newBall);
    
    // Start animation if it's not already running
    if (activeBalls.length === 1) {
        requestAnimationFrame(animateAllBalls);
    }
}

// Animate all active balls
function animateAllBalls(timestamp) {
    if (activeBalls.length === 0) return;
    
    const board = document.getElementById('plinkoBoard');
    const boardWidth = board.clientWidth;
    const boardHeight = board.clientHeight;
    
    // Get bucket positions for collision detection - FIXED VERSION
    const buckets = document.querySelector('.buckets');
    const bucketsRect = buckets.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    
    const bucketsLeft = bucketsRect.left - boardRect.left;
    const bucketsWidth = bucketsRect.width;
    const bucketCount = config.multipliers.length;
    const bucketWidth = bucketsWidth / bucketCount;
    
    // Process each active ball
    for (let i = activeBalls.length - 1; i >= 0; i--) {
        const ball = activeBalls[i];
        
        // Apply gravity
        ball.vy += config.gravity;
        
        // Apply friction
        ball.vx *= config.friction;
        ball.vy *= config.friction;
        
        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Collision with side walls
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx = -ball.vx * 0.5;
        } else if (ball.x + ball.radius > boardWidth) {
            ball.x = boardWidth - ball.radius;
            ball.vx = -ball.vx * 0.5;
        }
        
        // Collision with pegs
        for (const peg of pegLayout) {
            const dx = ball.x - peg.x;
            const dy = ball.y - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + 6) {
                // Calculate the angle of collision
                const angle = Math.atan2(dy, dx);
                
                // Move the ball outside of the peg
                const newX = peg.x + (ball.radius + 6) * Math.cos(angle);
                const newY = peg.y + (ball.radius + 6) * Math.sin(angle);
                
                ball.x = newX;
                ball.y = newY;
                
                // Add randomness to the bounce but with a slight bias toward outer edges
                let randomness = (Math.random() * 2 - 1) * config.pegInfluence;
                
                // Very subtle bias toward edges
                if (ball.x < boardWidth * 0.3) {
                    randomness -= 0.05; // Slight bias leftward
                } else if (ball.x > boardWidth * 0.7) {
                    randomness += 0.05; // Slight bias rightward
                }
                
                // Update velocity with a bounce effect and randomness
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                ball.vx = Math.cos(angle + randomness) * speed;
                ball.vy = Math.sin(Math.abs(angle + randomness)) * speed; // Keep ball moving downward

                // Highlight the peg temporarily
                peg.element.style.backgroundColor = '#ffdd59';
                setTimeout(() => {
                    peg.element.style.backgroundColor = peg.highlight ? '#ff4757' : 'white';
                }, 100);
            }
        }
        
        // Check if ball reached bucket level
        if (ball.y > boardHeight - 60) {
            // Calculate which bucket the ball fell into based on the fixed buckets position - FIXED VERSION
            let bucketIndex = -1;
            
            // Check if the ball is within the bucket area
            if (ball.x >= bucketsLeft && ball.x <= bucketsLeft + bucketsWidth) {
                // Calculate the bucket index based on the ball's position relative to the buckets
                bucketIndex = Math.floor((ball.x - bucketsLeft) / bucketWidth);
                bucketIndex = Math.min(bucketIndex, bucketCount - 1);
            } else {
                // If the ball is outside the bucket area, put it in the nearest edge bucket
                bucketIndex = ball.x < bucketsLeft ? 0 : bucketCount - 1;
            }
            
            // Apply multiplier to the bet
            const multiplier = config.multipliers[bucketIndex];
            const winAmount = Math.floor(ball.price * multiplier);
            balance += winAmount;
            document.getElementById('balance').textContent = balance;
            
            // Update profit/loss statistics
            if (winAmount > ball.price) {
                const profit = winAmount - ball.price;
                totalProfit += profit;
                document.getElementById('profit').textContent = totalProfit;
            } else if (winAmount < ball.price) {
                const loss = ball.price - winAmount;
                totalLoss += loss;
                document.getElementById('loss').textContent = totalLoss;
            }
            
            // Display result message
            const resultElement = document.getElementById('results');
            if (winAmount > ball.price) {
                resultElement.textContent = `You won ${winAmount} USDT!`;
                resultElement.style.color = '#1dd1a1';
            } else if (winAmount < ball.price) {
                resultElement.textContent = `You lost ${ball.price - winAmount} USDT`;
                resultElement.style.color = '#ff6b6b';
            } else {
                resultElement.textContent = `You broke even!`;
                resultElement.style.color = '#f7d794';
            }
            
            // Highlight the winning bucket
            const bucketElements = document.querySelectorAll('.bucket');
            bucketElements[bucketIndex].style.transform = 'translateY(-5px)';
            setTimeout(() => {
                bucketElements[bucketIndex].style.transform = 'translateY(0)';
            }, 300);
            
            // Remove ball from DOM
            ball.element.remove();
            
            // Remove ball from active balls array
            activeBalls.splice(i, 1);
        }
        
        // Update ball position in DOM
        ball.element.style.left = `${ball.x}px`;
        ball.element.style.top = `${ball.y}px`;
    }
    
    // Continue animation if there are still active balls
    if (activeBalls.length > 0) {
        requestAnimationFrame(animateAllBalls);
    }
}

// Initialize the game
window.addEventListener('DOMContentLoaded', () => {
    initializeBoard();
    
    // Update balance display
    document.getElementById('balance').textContent = balance;
    
    // Add event listener for the drop button
    document.getElementById('dropButton').addEventListener('click', () => {
        dropBall();
    });
    
    // Add event listeners for ball price adjustment
    document.getElementById('decreasePrice').addEventListener('click', () => {
        const priceInput = document.getElementById('ballPrice');
        let currentPrice = parseInt(priceInput.value);
        if (currentPrice > 5) {
            priceInput.value = currentPrice - 5;
        }
    });
    
    document.getElementById('increasePrice').addEventListener('click', () => {
        const priceInput = document.getElementById('ballPrice');
        let currentPrice = parseInt(priceInput.value);
        if (currentPrice < 1000) {
            priceInput.value = currentPrice + 5;
        }
    });
    
    // Ensure ball price is valid
    document.getElementById('ballPrice').addEventListener('change', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 5) {
            e.target.value = 5;
        } else if (value > 1000) {
            e.target.value = 1000;
        }
    });
});
