const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement); // This puts the canvas into the HTML

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xF3ACAC, 0.8);
        directionalLight.position.set(0, 2, 1);

        // Set the target for the directional light
        const targetObject = new THREE.Object3D();
        targetObject.position.set(0, 0, 0); // Set the target position
        scene.add(targetObject);
        directionalLight.target = targetObject;

        scene.add(directionalLight);

        // Load the GLB model
        const loader = new THREE.GLTFLoader();
        let model;

        loader.load(
            '/pill/pill.glb', // Path to your GLB file
            function (gltf) {
                model = gltf.scene;
                scene.add(model);

                // Adjust the camera position based on the model's size
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

                cameraZ *= 3; // Zoom out a little so object fits in view

                camera.position.z = cameraZ;

                // Center the camera on the object
                const controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.target.copy(center);
                controls.update();
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function (error) {
                console.error('An error happened', error);
            }
        );

        // Add an HTML element to display the light position
        const lightPositionDisplay = document.createElement('div');
        lightPositionDisplay.style.position = 'absolute';
        lightPositionDisplay.style.top = '10px';
        lightPositionDisplay.style.left = '10px';
        lightPositionDisplay.style.color = 'white';
        lightPositionDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        lightPositionDisplay.style.padding = '10px';
        lightPositionDisplay.style.borderRadius = '5px';
        document.body.appendChild(lightPositionDisplay);

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);

            if (model && isRotating) {
                model.rotation.y += 0.002;
            }

            // Update the light position display
            lightPositionDisplay.innerHTML = `
                Light Position:<br>
                X: ${directionalLight.position.x.toFixed(2)}<br>
                Y: ${directionalLight.position.y.toFixed(2)}<br>
                Z: ${directionalLight.position.z.toFixed(2)}
            `;

            renderer.render(scene, camera);
        }

        // Add interaction
        let isRotating = true;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let manipulateLight = true; // State to toggle between light and model manipulation

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        function onDocumentMouseDown(event) {
            event.preventDefault();

            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObject(model, true);

            if (intersects.length > 0) {
                manipulateLight = !manipulateLight; // Toggle between light and model manipulation
            }

            isDragging = true;
            previousMousePosition = { x: event.clientX, y: event.clientY };
        }

        function onDocumentMouseMove(event) {
            if (isDragging) {
                const deltaMove = {
                    x: event.clientX - previousMousePosition.x,
                    y: event.clientY - previousMousePosition.y
                };

                const rotationSpeed = 0.005;

                if (manipulateLight) {
                    // Manipulate directional light position
                    directionalLight.position.x += deltaMove.x * rotationSpeed;
                    directionalLight.position.y += deltaMove.y * rotationSpeed;
                } else {
                    // Manipulate model rotation
                    model.rotation.y += deltaMove.x * rotationSpeed;
                    model.rotation.x += deltaMove.y * rotationSpeed;
                }

                previousMousePosition = { x: event.clientX, y: event.clientY };
            }
        }

        function onDocumentMouseUp() {
            isDragging = false;
        }

        document.addEventListener('mousedown', onDocumentMouseDown, false);
        document.addEventListener('mousemove', onDocumentMouseMove, false);
        document.addEventListener('mouseup', onDocumentMouseUp, false);

        animate();

        // Handle window resizing
        window.addEventListener('resize', onWindowResize, false);

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }