let scene, camera, renderer, particles;
const count = 12000;
let currentState = 'sphere';

// Mouse / touch interaction
let pointer = { x: 0, y: 0 };
let cameraTarget = { x: 0, y: 0 };
let cameraPosition = { x: 0, y: 0, z: 25 };

// Initialize scene
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    document.getElementById('container').appendChild(renderer.domElement);

    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);

    createParticles();
    setupEventListeners();
    setupPointerEvents();
    animate();
}

// Create particles
function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    function sphericalDistribution(i) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        return {
            x: 8 * Math.cos(theta) * Math.sin(phi),
            y: 8 * Math.sin(theta) * Math.sin(phi),
            z: 8 * Math.cos(phi)
        };
    }

    for (let i = 0; i < count; i++) {
        const p = sphericalDistribution(i);
        positions[i * 3] = p.x + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.5;

        const depth = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2) / 8;
        const color = new THREE.Color().setHSL(0.5 + depth * 0.2, 0.7, 0.4 + depth * 0.3);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    if (particles) scene.remove(particles);
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

// Setup input events
function setupEventListeners() {
    const typeBtn = document.getElementById('typeBtn');
    const input = document.getElementById('morphText');

    typeBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (text) morphToText(text);
    });

    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            const text = input.value.trim();
            if (text) morphToText(text);
        }
    });
}

// Setup pointer movement
function setupPointerEvents() {
    window.addEventListener('mousemove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            pointer.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            pointer.y = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
        }
    }, { passive: true });
}

// Smooth camera follow
function updateCamera() {
    const smoothSpeed = 0.05;
    cameraTarget.x += (pointer.x * 10 - cameraTarget.x) * smoothSpeed;
    cameraTarget.y += (pointer.y * 10 - cameraTarget.y) * smoothSpeed;

    // Apply to camera
    camera.position.x = cameraTarget.x;
    camera.position.y = cameraTarget.y;

    // Keep looking at center
    camera.lookAt(0, 0, 0);
}

// Generate points from text
function createTextPoints(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 100;
    const padding = 20;

    ctx.font = `bold ${fontSize}px Arial`;
    const textMetrics = ctx.measureText(text);
    canvas.width = textMetrics.width + padding * 2;
    canvas.height = fontSize + padding * 2;

    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const points = [];
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 128 && Math.random() < 0.3) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            points.push({
                x: (x - canvas.width / 2) / (fontSize / 8),
                y: -(y - canvas.height / 2) / (fontSize / 8)
            });
        }
    }
    return points;
}

// Morph particles to text
function morphToText(text) {
    currentState = 'text';
    const textPoints = createTextPoints(text);
    const positions = particles.geometry.attributes.position.array;
    const target = new Float32Array(count * 3);

    gsap.to(particles.rotation, { x: 0, y: 0, z: 0, duration: 0.5 });

    for (let i = 0; i < count; i++) {
        if (i < textPoints.length) {
            target[i * 3] = textPoints[i].x;
            target[i * 3 + 1] = textPoints[i].y;
            target[i * 3 + 2] = 0;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 20 + 10;
            target[i * 3] = Math.cos(angle) * radius;
            target[i * 3 + 1] = Math.sin(angle) * radius;
            target[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
    }

    gsap.to(positions, {
        duration: 2,
        ease: "power2.inOut",
        endArray: target,
        onUpdate: () => particles.geometry.attributes.position.needsUpdate = true
    });

    setTimeout(morphToCircle, 4000);
}

// Morph particles back to sphere
function morphToCircle() {
    currentState = 'sphere';
    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;
    const target = new Float32Array(count * 3);
    const colorTarget = new Float32Array(count * 3);

    function sphericalDistribution(i) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        return {
            x: 8 * Math.cos(theta) * Math.sin(phi),
            y: 8 * Math.sin(theta) * Math.sin(phi),
            z: 8 * Math.cos(phi)
        };
    }

    for (let i = 0; i < count; i++) {
        const p = sphericalDistribution(i);
        target[i * 3] = p.x + (Math.random() - 0.5) * 0.5;
        target[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.5;
        target[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.5;

        const depth = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2) / 8;
        const c = new THREE.Color().setHSL(0.5 + depth * 0.2, 0.7, 0.4 + depth * 0.3);
        colorTarget[i * 3] = c.r;
        colorTarget[i * 3 + 1] = c.g;
        colorTarget[i * 3 + 2] = c.b;
    }

    gsap.to(positions, {
        duration: 2,
        ease: "power2.inOut",
        endArray: target,
        onUpdate: () => particles.geometry.attributes.position.needsUpdate = true
    });

    gsap.to(colors, {
        duration: 2,
        ease: "power2.inOut",
        endArray: colorTarget,
        onUpdate: () => particles.geometry.attributes.color.needsUpdate = true
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updateCamera();

    if (particles && currentState === 'sphere') {
        particles.rotation.y += 0.002;
    }

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
