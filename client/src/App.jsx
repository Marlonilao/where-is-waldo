import { useEffect, useRef, useState } from "react";
import styles from "./App.module.css";

const sceneId = 1;

export default function App() {
  const [game, setGame] = useState(null);
  const [targetingBox, setTargetingBox] = useState(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!targetingBox) return;
    function close(event) {
      if (!sceneRef.current.contains(event.target)) setTargetingBox(null);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [targetingBox]);

  async function start() {
    const res = await fetch("/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneId }),
    });
    setGame(await res.json());
  }

  function aim(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setTargetingBox({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  return (
    <main className={styles.app}>
      <h1>Where's Waldo?</h1>
      {game ? (
        <>
          <ul>
            {game.characters.map((character) => (
              <li key={character.id}>{character.name}</li>
            ))}
          </ul>
          <div className={styles.sceneArea} ref={sceneRef}>
            <img
              className={styles.scene}
              src={game.imageUrl}
              alt="Scene"
              onClick={aim}
            />
            {targetingBox && (
              <div
                className={styles.targetingBox}
                style={{ left: targetingBox.x, top: targetingBox.y }}
                aria-label="Targeting box"
              >
                <div className={styles.box} />
                <ul className={styles.menu} role="menu" aria-label="Characters">
                  {game.characters.map((character) => (
                    <li key={character.id} role="menuitem">
                      {character.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      ) : (
        <button onClick={start}>Start</button>
      )}
    </main>
  );
}
