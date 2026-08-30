import random

print("Let's play Rock, Paper, Scissors!")
print("Type rock, paper, or scissors. Type quit to stop.")

options = ["rock", "paper", "scissors"]
wins = 0
losses = 0
ties = 0

while True:
    player = input("Your choice: ").lower()

    if player == "quit":
        break

    if player not in options:
        print("Please type rock, paper, scissors, or quit.")
        continue

    computer = random.choice(options)
    print("Computer chose:", computer)

    if player == computer:
        print("It's a tie!")
        ties = ties + 1
    elif (player == "rock" and computer == "scissors") or \
         (player == "paper" and computer == "rock") or \
         (player == "scissors" and computer == "paper"):
        print("You win!")
        wins = wins + 1
    else:
        print("Computer wins!")
        losses = losses + 1

    print("Score - Wins:", wins, "Losses:", losses, "Ties:", ties)
    print()

print("\nFinal Score - Wins:", wins, "Losses:", losses, "Ties:", ties)
print("Thanks for playing!")