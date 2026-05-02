export default class GoogleElement {
    constructor(scene, x, y, width, height, renderCallback, options = {}) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.hits = 0;
        this.maxHits = options.maxHits || 3;
        this.isFallen = false;
        this.lastHitTime = 0;

        // Use a Container instead of RenderTexture for robust visual positioning
        this.container = scene.add.container(x, y);
        this.container.setSize(width, height);
        
        // Add visuals to container (callback handles this)
        renderCallback(this.container, scene, width, height);

        const physicsConfig = {
            isStatic: true,
            label: 'google-ui',
            mass: (width * height) / 1000,
            friction: 0.5,
            restitution: 0.2
        };

        if (options.shape) {
            physicsConfig.shape = options.shape;
        } else {
            // Apply a slight chamfer to all other default boxes to make them octagonal polygons
            physicsConfig.chamfer = { radius: Math.min(width, height) * 0.15 };
        }

        // Bind Matter physics directly to the container
        this.gameObject = scene.matter.add.gameObject(this.container, physicsConfig);

        // Compensate for Matter.js center-of-mass shift on custom polygons
        if (physicsConfig.shape && physicsConfig.shape.type === 'fromVerts' && options.origMinX !== undefined) {
            const body = this.gameObject.body;
            
            // Matter.js shifts vertices locally to center them on the center-of-mass.
            // By comparing the original bounding box min with the shifted world bounding box min, 
            // we find the exact center of mass offset calculated by Matter.
            const cmX = options.origMinX + body.position.x - body.bounds.min.x;
            const cmY = options.origMinY + body.position.y - body.bounds.min.y;
            
            // Move visuals to align with physics body
            this.container.each(child => {
                child.x = -cmX;
                child.y = -cmY;
            });
            
            // Move the container globally so the visuals end up exactly where they were originally intended!
            this.gameObject.setPosition(this.container.x + cmX, this.container.y + cmY);
        }

        // Store reference for pointer and collision logic
        this.gameObject.body.gameObjectClass = this;
    }

    takeHit() {
        if (this.isFallen) return; 
        
        const now = this.scene.time.now;
        if (now - this.lastHitTime < 200) return;
        this.lastHitTime = now;
        
        this.hits++;
        if (this.hits >= this.maxHits) {
            this.fallOut();
        } else {
            this.scene.tweens.add({
                targets: this.container,
                x: this.container.x + (Math.random() * 10 - 5),
                duration: 50,
                yoyo: true
            });
        }
    }

    fallOut() {
        if (this.isFallen) return;
        this.isFallen = true;
        
        this.gameObject.setStatic(false);
        
        // Matter.js static bodies have infinite mass and inertia. When becoming dynamic,
        // we must explicitly restore a finite mass and inertia so they can rotate (stop being AABB).
        const mass = (this.width * this.height) / 1000;
        this.gameObject.setMass(mass);
        
        // Ensure inertia is finite. If custom shape doesn't calculate well, fallback to rectangle approx
        let inertia = this.gameObject.body.inertia;
        if (inertia === Infinity || !inertia) {
            inertia = (mass * (this.width * this.width + this.height * this.height)) / 12;
            this.scene.matter.body.setInertia(this.gameObject.body, inertia);
        }
        
        // Give it a random rotation kick so the rotation is obvious
        this.gameObject.setAngularVelocity((Math.random() - 0.5) * 0.1);
        
        // Add a slight pop out force to make it feel impactful
        const forceX = (Math.random() - 0.5) * 0.02 * mass;
        const forceY = -0.01 * mass;
        this.gameObject.applyForce({ x: forceX, y: forceY });
    }
}
