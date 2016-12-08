# Texas hold-em

## TODOs
* Visual redesign (host first, then client)
* Calculate and display hand strength
* Manual name overrides
* Unit tests using [Jest](https://facebook.github.io/jest/)

## Bugs

### Split pots not calculated correctly
The program assumes that the player with the best hand (`playerList[0]`)
is a member of every subpot but it is possible that this player is
all-in with a smaller amount than the other players so the right
approach is to search the playerList (which is sorted in descending
order of hand value) for the first player who has nonzero `committedBet`
and THEN you can look to see who else is in a tie with THAT player.

### 88 > QQ?
Two people had pair of 8's and the pot was split btn them even though someone else had pair Q
