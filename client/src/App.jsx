import { useState } from "react";
import styles from "./App.module.css";

const sceneId = 1;

export default function App() {
  const [game, setGame] = useState(null);

  async function start() {
    const res = await fetch("/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneId }),
    });
    setGame(await res.json());
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
          <img className={styles.scene} src={game.imageUrl} alt="Scene" />
        </>
      ) : (
        <button onClick={start}>Start</button>
      )}
    </main>
  );
}
