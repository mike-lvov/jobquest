import React from "react";
import ReactDOM from "react-dom";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

import styles from "./countDownTimer.module.css";


const renderTime = ({ remainingTime }: { remainingTime: number }) => {
  if (remainingTime === 0) {
    return <div className={styles.timer}>Server is a bit <br /> overloaded...</div>;
  }

  return (
    <div className={styles.timer}>
      <div className={styles.text}>Next step in</div>
      <div className={styles.value}>{remainingTime}</div>
      <div className={styles.text}>seconds</div>
    </div>
  );
};

export const CountDownTimer = ({ duration }: {duration: number}) => {
  return (
    <div className={styles.timerWrapper}>
      <CountdownCircleTimer
        isPlaying
        duration={duration}
        colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
        colorsTime={[50, 30, 15, 0]}
        onComplete={() => ({ shouldRepeat: false, delay: 1 })}
      >
        {renderTime}
      </CountdownCircleTimer>
  </div>
  );
}