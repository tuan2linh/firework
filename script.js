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
  
  // create particle
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
  }
  
  // update particle
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
  
    // remove the particle once the alpha is low enough, based on the passed in index
    if (this.alpha <= this.decay) {
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
  
  // create particle group/explosion
  function createParticles(x, y) {
    // Play firework explosion sound
    const audio = document.getElementById('fireworkSound');
    audio.currentTime = 0; // Reset sound to start
    audio.play();
    
    // increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
    var particleCount = 250; // Giảm số lượng hạt (từ 325 xuống 250) để tối ưu hiệu năng
    while (particleCount--) {
      particles.push(new Particle(x, y));
    }
  }
  
  // main demo loop
  function loop() {
    // this function will run endlessly with requestAnimationFrame
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
  
    // loop over each firework, draw it, update it
    var i = fireworks.length;
    while (i--) {
      fireworks[i].draw();
      fireworks[i].update(i);
    }
  
    // loop over each particle, draw it, update it
    var i = particles.length;
    while (i--) {
      particles[i].draw();
      particles[i].update(i);
    }
  
    // launch fireworks automatically
    if (timerTick >= timerTotal) {
        if (!mousedown) {
            const startX = random(0, cw);
            const targetY = random(ch/4, ch/2.5); // Điều chỉnh phạm vi độ cao nổ
            fireworks.push(
                new Firework(startX, ch, startX, targetY)
            );
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
  
  // once the window loads, we are ready for some fireworks!
  window.onload = loop;
