import React, { useCallback, useReducer, useRef, useEffect } from "react";
import { useGameLoop, useInputEvent, useScene, Text } from "react-phaser-fiber";

import Ball from "./Ball";
import Block from "./Block";
import Paddle from "./Paddle";
import Config from "./config";

export default function Breakout() {
  const scene = useScene();
  const paddleRef = useRef<Phaser.Physics.Arcade.Image>(null);
  const ballRef = useRef<Phaser.Physics.Arcade.Image>(null);

  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    // set collisions on all edges of world except bottom
    scene.physics.world.setBoundsCollision(true, true, true, false);

    if (state.life <= 0) {
      dispatch({ type: "RESET_GAME" });
    }
  }, [scene, state.life]);

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
      <Text
        x={650}
        y={2}
        text={`LIFE: ${state.life}`}
        style={{ color: "white" }}
      />
      <Text
        x={2}
        y={2}
        text={`SCORE: ${state.score}`}
        style={{ color: "white" }}
      />
      <Text
        x={2}
        y={18}
        text={`BONUS: x${state.bonus}`}
        style={{ color: "white" }}
      />
      <Text
        x={2}
        y={36}
        text={`SEQUENCE: ${state.currentSequence}`}
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
            dispatch({ type: "RESET_BALL" });
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
          }}
        />
      ))}
    </>
  );
}

interface BreakoutState {
  isBallActive: boolean;
  life: number;
  score: number;
  bonus: number;
  currentSequence: number;
  precSequence: number;
  blocks: Array<{ x: number; y: number; frame: string; key: number }>;
}

const defaultState: BreakoutState = {
  isBallActive: false,
  life: 3,
  score: 0,
  bonus: 1,
  currentSequence: 0,
  precSequence: 0,
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
      return {
        ...defaultState,
        life: Config.game.initLife,
        score: 0,
        bonus: 1,
        currentSequence: 0,
        precSequence: 0,
      };
    }
    case "RESET_BALL": {
      /*
       *  When ball is lost, action is call twice
       *  cause isBallActive. So turn off isBallActive first,
       *  and return new score and life in second time.
       */

      return state.isBallActive
        ? {
            ...state,
            isBallActive: false,
          }
        : {
            ...state,
            life: state.life - 1,
            bonus: 1,
            currentSequence: 0,
            precSequence: 0,
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
      let newBonus = state.bonus;
      let newPrecSequence = state.precSequence;

      if (
        state.currentSequence >= 4 &&
        Math.round((state.precSequence + 4) / 2) * state.bonus <=
          state.currentSequence
      ) {
        newBonus++;
        newPrecSequence = state.currentSequence;
      }

      return {
        ...state,
        score: state.score + Config.block.defaultScore * state.bonus,
        currentSequence: state.currentSequence + 1,
        bonus: newBonus,
        precSequence: newPrecSequence,
        blocks: state.blocks.filter((block) => block.key !== action.payload),
      };
    }
  }
  return state;
}
