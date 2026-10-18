import { useEffect, useRef, useState } from "react";
import styles from "./App.module.css";

const sceneId = 1;

function formatTime(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function App() {
  const [game, setGame] = useState(null);
  const [targetingBox, setTargetingBox] = useState(null);
  const [message, setMessage] = useState(null);
  const [found, setFound] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [timeMs, setTimeMs] = useState(null);
  const [nameError, setNameError] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!game || timeMs !== null) return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [game, timeMs]);

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
    if (timeMs !== null) return;
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
      const { correct, hitBox, finished, timeMs: finalTimeMs } = await res.json();
      if (correct) setFound((found) => ({ ...found, [character.id]: hitBox }));
      if (finished) {
        setTimeMs(finalTimeMs);
        setMessage(`You found everyone in ${formatTime(finalTimeMs)}!`);
      } else {
        setMessage(correct ? `You found ${character.name}!` : "Try again!");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    }
    setTargetingBox(null);
  }

  async function saveName(event) {
    event.preventDefault();
    const name = event.currentTarget.elements.name.value;
    try {
      const res = await fetch(`/games/${game.id}/name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.status === 400) {
        return setNameError("Your name must be 1–20 characters.");
      }
      // 409 means the name was already saved, e.g. on a retry.
      if (!res.ok && res.status !== 409) {
        throw new Error(`Saving name failed: ${res.status}`);
      }
      const board = await fetch(`/scenes/${sceneId}/leaderboard`);
      if (!board.ok) throw new Error(`Leaderboard failed: ${board.status}`);
      setLeaderboard(await board.json());
    } catch {
      setNameError("Something went wrong. Please try again.");
    }
  }

  function playAgain() {
    setGame(null);
    setMessage(null);
    setFound({});
    setElapsed(0);
    setTimeMs(null);
    setNameError(null);
    setLeaderboard(null);
  }

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Where's Waldo?</h1>
      </header>
      {game ? (
        <>
          <div className={styles.hud}>
            <p role="timer" className={styles.timer}>
              {formatTime(timeMs ?? elapsed)}
            </p>
            <ul className={styles.characters}>
              {game.characters.map((character) => (
                <li
                  key={character.id}
                  className={found[character.id] ? styles.foundChip : styles.chip}
                >
                  <img className={styles.headshot} src={character.imageUrl} alt="" />
                  {character.name}
                </li>
              ))}
            </ul>
          </div>
          {message && (
            <p role="status" className={styles.status}>
              {message}
            </p>
          )}
          {leaderboard ? (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Leaderboard</h2>
              <ol className={styles.leaderboard}>
                {leaderboard.map((score, i) => (
                  <li key={i}>
                    {score.name} {formatTime(score.timeMs)}
                  </li>
                ))}
              </ol>
              <button className={styles.button} onClick={playAgain}>
                Play again
              </button>
            </section>
          ) : (
            timeMs !== null && (
              <form className={styles.card} onSubmit={saveName}>
                <label className={styles.label}>
                  Name <input className={styles.input} name="name" />
                </label>
                <button className={styles.button}>Save</button>
                {nameError && (
                  <p role="alert" className={styles.error}>
                    {nameError}
                  </p>
                )}
              </form>
            )
          )}
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
                  >
                    <span className={styles.foundTag}>
                      <img className={styles.headshot} src={character.imageUrl} alt="" />
                      {character.name} ✓
                    </span>
                  </div>
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
                      <img className={styles.headshot} src={character.imageUrl} alt="" />
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
        <section className={styles.intro}>
          <p className={styles.tagline}>
            Find every Character hidden in the Scene as fast as you can.
          </p>
          <button className={styles.button} onClick={start}>
            Start
          </button>
        </section>
      )}
    </main>
  );
}
