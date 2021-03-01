import React, {
  useCallback,
  useReducer,
  useRef,
  useEffect,
  useState,
} from "react";
import { useGameLoop, useInputEvent, useScene, Text } from "react-phaser-fiber";
import Ball from "./Ball";
import Block from "./Block";
import Paddle from "./Paddle";

export default function Breakout() {
  const scene = useScene();
  const paddleRef = useRef<Phaser.Physics.Arcade.Image>(null);
  const ballRef = useRef<Phaser.Physics.Arcade.Image>(null);

  const [state, dispatch] = useReducer(reducer, defaultState);
  const [life, setLife] = useState(3);
  const [score, setScore] = useState(0);
  const [bonus, setBonus] = useState(1);
  const [currentSequence, setCurrentSequence] = useState(0);
  const [precSequence, setPrecSequence] = useState(0);

  useEffect(() => {
    // set collisions on all edges of world except bottom
    scene.physics.world.setBoundsCollision(true, true, true, false);

    if (life <= 0) {
      setLife(3);
      setScore(0);
      setBonus(1);
      setCurrentSequence(0);
      setPrecSequence(0);

      dispatch({ type: "RESET_GAME" });
    }
  }, [scene, life, currentSequence, precSequence, bonus]);

  useGameLoop(
    useCallback(() => {
      // restart game when all blocks are destroyed
      if (state.blocks.length === 0) {
        if (paddleRef.current && ballRef.current) {
          ballRef.current.setVelocity(0, 0);
          ballRef.current.setPosition(
            paddleRef.current.x,
            paddleRef.current.y - 48
          );
          dispatch({ type: "RESET_GAME" });
        }
      }
    }, [state.blocks.length])
  );

  // launch ball when clicked
  useInputEvent(
    "pointerdown",
    useCallback(() => {
      if (ballRef.current && !state.isBallActive) {
        ballRef.current.setVelocity(-75, -600);
        dispatch({ type: "PLAY" });
      }
    }, [state.isBallActive])
  );

  return (
    <>
      <Text x={650} y={2} text={`VIE: ${life}`} style={{ color: "white" }} />
      <Text x={2} y={2} text={`SCORE: ${score}`} style={{ color: "white" }} />
      <Text x={2} y={18} text={`BONUS: x${bonus}`} style={{ color: "white" }} />
      <Text
        x={2}
        y={36}
        text={`SEQUENCE: ${currentSequence}`}
        style={{ color: "white" }}
      />
      <Paddle ref={paddleRef} initialX={400} initialY={700} />
      <Ball
        ref={ballRef}
        paddleRef={paddleRef}
        snapToPaddle={!state.isBallActive}
        onReset={() => {
          // reset ball position if it exits bottom of screen
          if (ballRef.current && ballRef.current.y > 800) {
            ballRef.current.setVelocity(0);
            setBonus(1);
            setCurrentSequence(0);
            setPrecSequence(0);
            dispatch({ type: "RESET_BALL" });
            setLife(life - 1);
          }
        }}
      />
      {state.blocks.map(({ key, x, y, frame }) => (
        <Block
          key={key}
          x={x + 116}
          y={y + 200}
          frame={frame}
          onBallHit={() => {
            dispatch({ type: "BLOCK_HIT", payload: key });
            setScore(score + 50 * bonus);
            setCurrentSequence(currentSequence + 1);

            if (
              currentSequence >= 4 &&
              Math.round((precSequence + 4) / 2) * bonus <= currentSequence
            ) {
              setBonus(bonus + 1);
              setPrecSequence(currentSequence);
            }
          }}
        />
      ))}
    </>
  );
}

interface BreakoutState {
  isBallActive: boolean;
  blocks: Array<{ x: number; y: number; frame: string; key: number }>;
}

const defaultState: BreakoutState = {
  isBallActive: false,
  blocks: Array.from({ length: 60 }).map((_, index) => {
    // possible sprites to use for block
    const blockFrames = [
      "blue1",
      "red1",
      "green1",
      "yellow1",
      "silver1",
      "purple1",
    ];

    return {
      x: (index % 10) * 64,
      y: 10 * Math.floor(index / 10) * 3.2,
      // each row uses same sprite
      frame: blockFrames[Math.floor(index / 10)],
      key: index,
    };
  }),
};

function reducer(
  state: BreakoutState,
  action: { type: string; payload?: any }
): BreakoutState {
  switch (action.type) {
    case "RESET_GAME": {
      return defaultState;
    }
    case "RESET_BALL": {
      return {
        ...state,
        isBallActive: false,
      };
    }
    case "PLAY": {
      return {
        ...state,
        isBallActive: true,
      };
    }
    case "BLOCK_HIT": {
      return {
        ...state,
        blocks: state.blocks.filter((block) => block.key !== action.payload),
      };
    }
  }
  return state;
}
