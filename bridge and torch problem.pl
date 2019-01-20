speed(legolas, 1).
speed(aragorn, 3).
speed(gilmi, 5).
speed(gandalf, 8).

computeTime([P], TimeSpent) :-
  speed(P, TimeSpent).
computeTime([P1, P2], TimeSpent) :-
  speed(P1, T1),
  speed(P2, T2),
  TimeSpent = max(T1, T2).

moveHelper([], Src, Dst, Src, Dst).
moveHelper([P], Src, Dst, NSrc, NDst) :-
  delete(Src, P, NSrc),
  append(Dst, [P], NDst).
moveHelper([P1, P2], Src, Dst, NSrc, NDst) :-
  delete(Src, P1, TempSrc),
  delete(TempSrc, P2, NSrc),
  append(Dst, [P1, P2], NDst).

psngHelper(Passengers, Src, 1, Len) :-
  between(1, Len, Pos),
  nth1(Pos, Src, Passenger1),
  Passengers = [Passenger1].
psngHelper(Passengers, Src, 2, Len) :-
  TempLen is Len - 1,
  between(1, TempLen, Pos1),
  nth1(Pos1, Src, Passenger1),
  TempPos is Pos1 + 1,
  between(TempPos, Len, Pos2),
  nth1(Pos2, Src, Passenger2),
  Passengers = [Passenger1, Passenger2].

passengersAre([], []).
passengersAre([P], [P]).
passengersAre(Passengers, Src) :-
  between(1, 2, MaxNum),
  length(Src, Len),
  psngHelper(Passengers, Src, MaxNum, Len).

move(Bound, [LSide, RSide, left, Time], [NLSide, NRSide, right, NTime]) :-
  move(Bound, Time, NTime,  LSide, RSide, NLSide, NRSide).
move(Bound, [LSide, RSide, right, Time], [NLSide, NRSide, left, NTime]) :-
  move(Bound, Time, NTime, RSide, LSide, NRSide, NLSide).
move(Bound, Time, NTime, Src, Dst, NSrc, NDst) :-
  passengersAre(Passengers, Src),
  moveHelper(Passengers, Src, Dst, NSrc, NDst),
  computeTime(Passengers, TimeSpent),
  NTime is Time + TimeSpent,
  NTime =< Bound.

goal([[], _, right, _]).

try(_, State, States, States) :-
  goal(State).

try(Bound, State, States, Solution) :-
  \+goal(State),
  move(Bound, State, NState),
  append(States, [NState], NStates),
  try(Bound, NState, NStates, Solution).

passUnder(Time) :-
  InitState = [[legolas, aragorn, gilmi, gandalf], [], left, 0],
  try(Time, InitState, [InitState], _).

how(Time, Solution) :-
  InitState = [[legolas, aragorn, gilmi, gandalf], [], left, 0],
  try(Time, InitState, [InitState], Solution).
