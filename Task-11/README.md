# ***ROCK-PAPER-SCISSOR***

Type rock, paper, or scissors when prompted, or type quit to end the game.

## ***How It's Built***

- The game is written as a single, linear script (no functions or classes) so the logic is easy to follow top to bottom.
- The game runs inside a while True: loop so the player can play as many rounds as they want. Typing quit breaks out of the loop and ends the game.
- If the player types something that isn't a valid option, the game prints a message and uses continue to skip back to the top of the loop and ask again.
- ***random.choice()*** picks one item at random from the options list, simulating the computer's move.
- This uses the classic Rock-Paper-Scissors rules:

  -Rock beats scissors
  -Paper beats rock
  -Scissors beats paper

- Each winning combination for the player is checked explicitly with and/or conditions.
- After each round, the relevant counter (wins, losses, or ties) is incremented by 1, and the running score is printed.
- When the player quits, the final score is printed as a summary.

## ***Improvements***

- Add functions to organize the code
- Add error handling for unexpected input
- Save scores to a file between sessions
