const { Canvas, useFrame, useLoader } = ReactThreeFiber;
const { OrbitControls, Environment, useGLTF } = drei;

function Model({ url }) {
  const { scene } = useGLTF(url);
  const modelRef = React.useRef();

  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.5;
    }
  });

  return <primitive object={scene} ref={modelRef} />;
}

function App() {
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 50 }}
        onCreated={() => setIsLoaded(true)}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <Model url="/rsc/pill.gltf" />
        <OrbitControls enablePan={false} enableZoom={true} enableRotate={true} />
        <Environment preset="studio" />
      </Canvas>
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          fontSize: '24px'
        }}>
          Loading 3D model...
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        color: 'white',
        fontSize: '14px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '8px',
        borderRadius: '4px'
      }}>
        <p>This is a 3D model of a pill. Use mouse or touch to rotate and zoom.</p>
        <button 
          style={{
            marginTop: '8px',
            backgroundColor: '#4CAF50',
            border: 'none',
            color: 'white',
            padding: '10px 20px',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'inline-block',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
          onClick={() => alert('This is a 3D model of a pill. It demonstrates the shape and form of a typical medicinal pill.')}
        >
          More Info
        </button>
      </div>
    </div>
  );
}

// Preload the model
useGLTF.preload("/rsc/pill.gltf");

ReactDOM.render(<App />, document.getElementById('root'));