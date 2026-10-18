import { useEffect, useRef, useState } from "react";
import styles from "./App.module.css";

const sceneId = 1;

export default function App() {
  const [game, setGame] = useState(null);
  const [targetingBox, setTargetingBox] = useState(null);
  const [message, setMessage] = useState(null);
  const [found, setFound] = useState({});
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const inFound = Object.values(found).some(
      (box) =>
        x / rect.width >= box.x1 &&
        x / rect.width <= box.x2 &&
        y / rect.height >= box.y1 &&
        y / rect.height <= box.y2
    );
    if (inFound) return;
    setTargetingBox({ x, y, width: rect.width, height: rect.height });
  }

  async function guess(character) {
    try {
      const res = await fetch(`/games/${game.id}/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          x: targetingBox.x / targetingBox.width,
          y: targetingBox.y / targetingBox.height,
        }),
      });
      if (!res.ok) throw new Error(`Guess failed: ${res.status}`);
      const { correct, hitBox } = await res.json();
      if (correct) setFound((found) => ({ ...found, [character.id]: hitBox }));
      setMessage(correct ? `You found ${character.name}!` : "Try again!");
    } catch {
      setMessage("Something went wrong. Please try again.");
    }
    setTargetingBox(null);
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
          {message && <p role="status">{message}</p>}
          <div className={styles.sceneArea} ref={sceneRef}>
            <img
              className={styles.scene}
              src={game.imageUrl}
              alt="Scene"
              onClick={aim}
            />
            {game.characters
              .filter((character) => found[character.id])
              .map((character) => {
                const box = found[character.id];
                return (
                  <div
                    key={character.id}
                    className={styles.outline}
                    style={{
                      left: `${box.x1 * 100}%`,
                      top: `${box.y1 * 100}%`,
                      width: `${(box.x2 - box.x1) * 100}%`,
                      height: `${(box.y2 - box.y1) * 100}%`,
                    }}
                    aria-label={`Found ${character.name}`}
                  />
                );
              })}
            {targetingBox && (
              <div
                className={styles.targetingBox}
                style={{ left: targetingBox.x, top: targetingBox.y }}
                aria-label="Targeting box"
              >
                <div className={styles.box} />
                <ul className={styles.menu} role="menu" aria-label="Characters">
                  {game.characters.map((character) => (
                    <li
                      key={character.id}
                      role="menuitem"
                      {...(found[character.id]
                        ? { "aria-disabled": "true", className: styles.found }
                        : { onClick: () => guess(character) })}
                    >
                      {character.name}
                      {found[character.id] && " ✓"}
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
