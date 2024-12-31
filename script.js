// Add at the beginning of the file
const settingsBtn = document.querySelector('.settings-btn');
const settingsPanel = document.querySelector('.settings-panel');
const audioToggle = document.getElementById('audioToggle');
const volumeControl = document.getElementById('volumeControl');
const volumeContainer = document.querySelector('.volume-control');
const speedControl = document.getElementById('speedControl');

// Thêm biến để lưu trữ tốc độ cơ bản
const baseTimerTotal = 75;
const baseLimiterTotal = 5;

// Add these variables at the beginning of the file
const DISPLAY_DURATION = 36000; // 36 seconds in milliseconds
const TEXT_DISPLAY_TIME = 15000; // 15 seconds in milliseconds
const SPECIAL_EFFECT_TIME = 36000; // 26 seconds
let startTime = null;
let isDisplaying = true;
let textDisplayed = false;
let specialEffectDisplayed = false;

// Add these variables at the beginning with other variables
let finalExplosionsCreated = false;
let isFinalDisplay = false;

settingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
});

audioToggle.addEventListener('change', (e) => {
    const fireworkSound = document.getElementById('fireworkSound');
    fireworkSound.muted = !e.target.checked;
    // Toggle volume control visibility
    volumeContainer.classList.toggle('active', e.target.checked);
});

volumeControl.addEventListener('input', (e) => {
    const fireworkSound = document.getElementById('fireworkSound');
    fireworkSound.volume = e.target.value / 100;
});

speedControl.addEventListener('input', (e) => {
    const speedFactor = e.target.value / 100;
    timerTotal = Math.floor(baseTimerTotal / speedFactor);
    limiterTotal = Math.floor(baseLimiterTotal / speedFactor);
});

// when animating on canvas, it is best to use requestAnimationFrame instead of setTimeout or setInterval
// not supported in all browsers though and sometimes needs a prefix, so we need a shim
window.requestAnimFrame = (function () {
    return (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      }
    );
  })();
  
  // now we will setup our basic variables for the demo
  var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d"),
    // full screen dimensions
    cw = window.innerWidth,
    ch = window.innerHeight,
    // firework collection
    fireworks = [],
    // particle collection
    particles = [],
    // starting hue
    hue = 120,
    // when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
    limiterTotal = baseLimiterTotal,
    limiterTick = 0,
    // this will time the auto launches of fireworks, one launch per 80 loop ticks
    timerTotal = baseTimerTotal,
    timerTick = 0,
    mousedown = false,
    // mouse x coordinate,
    mx,
    // mouse y coordinate
    my;
  
  // set canvas dimensions
  canvas.width = cw;
  canvas.height = ch;
  
  // now we are going to setup our function placeholders for the entire demo
  
  // get a random number within a range
  function random(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  // calculate the distance between two points
  function calculateDistance(p1x, p1y, p2x, p2y) {
    var xDistance = p1x - p2x,
      yDistance = p1y - p2y;
    return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
  }
  
  // create firework
  function Firework(sx, sy, tx, ty) {
    // actual coordinates
    this.x = sx;
    this.y = sy;
    // starting coordinates
    this.sx = sx;
    this.sy = sy;
    // target coordinates
    this.tx = tx;
    this.ty = ty;
    // distance from starting point to target
    this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
    this.distanceTraveled = 0;
    // track the past coordinates for trail effect
    this.coordinates = [];
    this.coordinateCount = 3; // Tăng độ dài trail
    while (this.coordinateCount--) {
        this.coordinates.push([this.x, this.y]);
    }
    this.angle = Math.atan2(ty - sy, tx - sx);
    this.speed = 8; // Tăng tốc độ ban đầu
    this.acceleration = 1.01; // Giảm gia tốc xuống rất nhỏ
    this.brightness = random(50, 70);
    this.targetRadius = 1;
    
    // Thêm hiệu ứng trail khi bắn lên
    this.trail = [];
    this.trailLength = 10; // Tăng độ dài trail
    for (let i = 0; i < this.trailLength; i++) {
        this.trail.push({
            x: this.x,
            y: this.y,
            alpha: (1 - (i / this.trailLength)) * 0.8 // Giảm độ trong suốt của trail
        });
    }
  }
  
  // update firework
  Firework.prototype.update = function (index) {
    // remove last item in coordinates array
    this.coordinates.pop();
    // add current coordinates to the start of the array
  
    this.coordinates.unshift([this.x, this.y]);
  
    // Update trail
    this.trail.pop();
    this.trail.unshift({
        x: this.x,
        y: this.y,
        alpha: 1
    });

    // update trail alphas
    for (let i = 1; i < this.trail.length; i++) {
        this.trail[i].alpha = 1 - (i / this.trailLength);
    }

    // Tăng tốc độ nhẹ nhàng hơn
    this.speed *= this.acceleration;

    // Tính toán vận tốc với gia tốc thấp hơn
    var vx = Math.cos(this.angle) * this.speed,
        vy = Math.sin(this.angle) * this.speed;

    // Thêm trọng lực rất nhỏ
    vy += 0.01; // Giảm ảnh hưởng của trọng lực

    this.distanceTraveled = calculateDistance(
        this.sx,
        this.sy,
        this.x + vx,
        this.y + vy
    );

    // if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
    if (this.distanceTraveled >= this.distanceToTarget) {
      createParticles(this.tx, this.ty);
      // remove the firework, use the index passed into the update function to determine which to remove
      fireworks.splice(index, 1);
    } else {
      // target not reached, keep traveling
      this.x += vx;
      this.y += vy;
    }
  };
  
  // draw firework
  Firework.prototype.draw = function () {
    // Vẽ trail
    ctx.beginPath();
    for (let i = 0; i < this.trail.length; i++) {
        const trail = this.trail[i];
        if (i === 0) {
            ctx.moveTo(trail.x, trail.y);
        } else {
            ctx.lineTo(trail.x, trail.y);
        }
        ctx.strokeStyle = `hsla(${hue}, 100%, ${this.brightness}%, ${trail.alpha})`;
        ctx.stroke();
    }

    // Vẽ đầu pháo hoa
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
    ctx.fill();
  };
  
  // Modify the Particle constructor
  function Particle(x, y) {
    this.x = x;
    this.y = y;
    // track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
    this.coordinates = [];
    this.coordinateCount = 5;
    while (this.coordinateCount--) {
      this.coordinates.push([this.x, this.y]);
    }
    // set a random angle in all possible directions, in radians
    this.angle = random(0, Math.PI * 2);
    this.speed = random(1, 10);
    // friction will slow the particle down
    this.friction = 0.97; // Tăng ma sát (từ 0.999 xuống 0.97)
    // gravity will be applied and pull the particle down
    this.gravity = 0.7; // Giảm trọng lực (từ 1 xuống 0.7)
    // set the hue to a random number +-20 of the overall hue variable
    this.hue = random(hue - 20, hue + 20);
    this.brightness = random(50, 80);
    this.alpha = 1;
    // set how fast the particle fades out
    this.decay = random(0.005, 0.015); // Giảm decay rate xuống (từ 0.015-0.03 thành 0.005-0.015)
    this.isFinal = false; // Add this line
  }
  
  // Modify the Particle update method
  Particle.prototype.update = function (index) {
    // remove last item in coordinates array
    this.coordinates.pop();
    // add current coordinates to the start of the array
    this.coordinates.unshift([this.x, this.y]);
    // slow down the particle
    this.speed *= this.friction;
    // apply velocity
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed + this.gravity;
    // fade out the particle
    this.alpha -= this.decay;
  
    // Change the removal condition
    if (this.alpha <= this.decay && !this.isFinal) {
      particles.splice(index, 1);
    }
  };
  
  // draw particle
  Particle.prototype.draw = function () {
    ctx.beginPath();
    // move to the last tracked coordinates in the set, then draw a line to the current x and y
    ctx.moveTo(
      this.coordinates[this.coordinates.length - 1][0],
      this.coordinates[this.coordinates.length - 1][1]
    );
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle =
      "hsla(" +
      this.hue +
      ", 100%, " +
      this.brightness +
      "%, " +
      this.alpha +
      ")";
    ctx.stroke();
  };
  
  // Modify the createParticles function
  function createParticles(x, y, isFinal = false) {
    if (isDisplaying) {  // Chỉ phát âm thanh khi đang trong thời gian hiển thị
        const audio = document.getElementById('fireworkSound');
        if (!audio.muted && audio.paused) {  // Chỉ phát lại nếu âm thanh đã kết thúc và không bị tắt tiếng
            audio.currentTime = 0;
            audio.play().catch(err => console.log('Audio play failed:', err));
        }
    }
    
    var particleCount = 250; // Giảm số lượng hạt (từ 325 xuống 250) để tối ưu hiệu năng
    while (particleCount--) {
        const particle = new Particle(x, y);
        particle.isFinal = isFinal;
        if (isFinal) {
            particle.decay = 0; // Prevent fading for final particles
            particle.alpha = 0.8; // Set a constant alpha for final particles
        }
        particles.push(particle);
    }
  }
  
  // Sửa lại hàm để bắn pháo hoa thẳng lên
  function launchRandomFirework() {
    const startX = random(cw * 0.2, cw * 0.8);
    // Bắn thẳng lên bằng cách sử dụng cùng một vị trí X cho điểm bắt đầu và kết thúc
    fireworks.push(new Firework(
        startX,      // điểm bắt đầu X
        ch,          // điểm bắt đầu Y (dưới cùng)
        startX,      // điểm kết thúc X (cùng vị trí với điểm bắt đầu)
        random(ch * 0.2, ch * 0.5)  // điểm kết thúc Y (độ cao ngẫu nhiên)
    ));
  }

  // Add this new function before the loop function
  function createMultipleExplosions() {
    const numExplosions = 10;
    for (let i = 0; i < numExplosions; i++) {
        // Calculate random positions that are well-distributed across the screen
        const x = random(cw * 0.1, cw * 0.9);
        const y = random(ch * 0.2, ch * 0.7);
        createParticles(x, y);
    }
  }

  // Modify the loop function
  function loop() {
    if (!startTime) {
        startTime = Date.now();
        // Bắn ngay một loạt pháo hoa khi bắt đầu
        for(let i = 0; i < 3; i++) {
            launchRandomFirework();
        }
    }
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;

    // Special effect at 26 seconds
    if (elapsedTime >= SPECIAL_EFFECT_TIME && !specialEffectDisplayed) {
        specialEffectDisplayed = true;
        createMultipleExplosions();
    }

    // Show text after 15 seconds
    if (elapsedTime >= TEXT_DISPLAY_TIME && !textDisplayed) {
        textDisplayed = true;
        const newYearText = document.createElement('div');
        newYearText.className = 'new-year-text';
        newYearText.innerHTML = 'Happy New Year<br>2025';
        document.body.appendChild(newYearText);
        setTimeout(() => newYearText.classList.add('show'), 100);
    }

    // Create final explosions at exactly 36000ms
    if (elapsedTime >= DISPLAY_DURATION && !finalExplosionsCreated) {
        finalExplosionsCreated = true;
        isFinalDisplay = true;
        // Clear existing particles and fireworks
        particles.length = 0;
        fireworks.length = 0;
        
        // Create 10 final explosions
        for (let i = 0; i < 10; i++) {
            const x = random(cw * 0.1, cw * 0.9);
            const y = random(ch * 0.2, ch * 0.7);
            createParticles(x, y, true);
        }
    }

    requestAnimFrame(loop);
  
    // increase the hue to get different colored fireworks over time
    hue += 0.7;
  
    // normally, clearRect() would be used to clear the canvas
    // we want to create a trailing effect though
    // setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
    ctx.globalCompositeOperation = "destination-out";
    // decrease the alpha property to create more prominent trails
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, cw, ch);
    // change the composite operation back to our main mode
    // lighter creates bright highlight points as the fireworks and particles overlap each other
    ctx.globalCompositeOperation = "lighter";
  
    // Update fireworks only if not in final display
    if (!isFinalDisplay) {
        var i = fireworks.length;
        while (i--) {
            fireworks[i].draw();
            fireworks[i].update(i);
        }
    }
  
    // Always update particles
    var i = particles.length;
    while (i--) {
      particles[i].draw();
      particles[i].update(i);
    }
  
    // Only continue with normal firework generation if not in final display
    if (!isFinalDisplay) {
        // Sửa lại phần tự động bắn
        if (timerTick >= timerTotal) {
            if (isDisplaying) {
                const numFireworks = Math.floor(random(1, 4));
                for (let i = 0; i < numFireworks; i++) {
                    launchRandomFirework();
                }
                timerTick = 0;
            }
        } else {
            timerTick++;
        }

        // Sửa đổi phần bắn khi click chuột
        if (limiterTick >= limiterTotal) {
            if (mousedown) {
                fireworks.push(new Firework(mx, ch, mx, my));
                limiterTick = 0;
            }
        } else {
            limiterTick++;
        }
    }
  }
  
  //2025 coding project
  
  // mouse event bindings
  // update the mouse coordinates on mousemove
  canvas.addEventListener("mousemove", function (e) {
    mx = e.pageX - canvas.offsetLeft;
    my = e.pageY - canvas.offsetTop;
  });
  
  // toggle mousedown state and prevent canvas from being selected
  canvas.addEventListener("mousedown", function (e) {
    e.preventDefault();
    mousedown = true;
  });
  
  canvas.addEventListener("mouseup", function (e) {
    e.preventDefault();
    mousedown = false;
  });
  
  // Add after the existing mouse event bindings

// Touch event bindings for mobile
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    mousedown = true;
    const touch = e.touches[0];
    mx = touch.pageX - canvas.offsetLeft;
    my = touch.pageY - canvas.offsetTop;
});

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    mx = touch.pageX - canvas.offsetLeft;
    my = touch.pageY - canvas.offsetTop;
});

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    mousedown = false;
});

// Add touch event for settings button
settingsBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
});

// Close settings panel when touching outside
document.addEventListener('touchstart', (e) => {
    if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
        settingsPanel.style.display = 'none';
    }
});

// Update orientation handling
window.addEventListener('orientationchange', function() {
    // Update canvas dimensions on orientation change
    setTimeout(() => {
        cw = window.innerWidth;
        ch = window.innerHeight;
        canvas.width = cw;
        canvas.height = ch;
    }, 200);
});

  // once the window loads, we are ready for some fireworks!
  window.onload = function() {
    // Khởi tạo âm thanh
    const fireworkSound = document.getElementById('fireworkSound');
    fireworkSound.volume = volumeControl.value / 100;
    fireworkSound.muted = false;
    audioToggle.checked = true;
    
    // Thêm xử lý cho mobile
    document.addEventListener('touchstart', function() {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        context.resume().then(() => {
            console.log('Audio context started');
        });
    }, false);

    // Tự động phát âm thanh khi trang web load xong
    fireworkSound.play().catch(err => {
        console.log('Initial audio play failed:', err);
        // Thử phát lại sau khi có tương tác người dùng
        document.addEventListener('click', function initAudio() {
            fireworkSound.play();
            document.removeEventListener('click', initAudio);
        }, {once: true});
    });
    
    // Bắt đầu animation pháo hoa
    loop();
}
