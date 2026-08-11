/* Worked examples straight from Topic 01: From Problem to Algorithm. */

const PRESETS = [
  {
    name: 'Delivery Fee (Algorithm 1-2)',
    inputs: '7, true',
    code: `READ distance
READ is_customer_premium
IF distance <= 0 THEN
    WRITE "INVALID"
ELSE
    fee <- 80
    IF distance <= 3 THEN
        fee <- 30
    ELSE IF distance <= 10 THEN
        fee <- 50
    ENDIF
    IF is_customer_premium THEN
        fee <- fee - 10
    ENDIF
    WRITE fee
ENDIF`,
  },
  {
    name: 'Library Fine, corrected (Algorithm 1-4)',
    inputs: '50, false, true',
    code: `READ overdue_days
READ book_lost
READ member
IF overdue_days < 0 THEN
    WRITE "INVALID"
ELSE IF book_lost THEN
    WRITE 500
ELSE
    fine <- overdue_days * 10
    IF fine > 300 THEN
        fine <- 300
    ENDIF
    IF member THEN
        fine <- fine - 20
    ENDIF
    IF fine < 0 THEN
        fine <- 0
    ENDIF
    WRITE fine
ENDIF`,
  },
  {
    name: 'Parking Fee (Pseudocode 1-5)',
    inputs: '15, false, true',
    code: `READ hours
READ ticket_lost
READ is_employee
IF hours < 0 THEN
    WRITE "INVALID"
ELSE IF ticket_lost THEN
    WRITE 500
ELSE
    fee <- hours * 20
    IF fee > 200 THEN
        fee <- 200
    ENDIF
    IF is_employee THEN
        fee <- fee - 40
    ENDIF
    IF fee < 0 THEN
        fee <- 0
    ENDIF
    WRITE fee
ENDIF`,
  },
  {
    name: 'Reward Points, with loop (Pseudocode 1-6)',
    inputs: '5, true, 200, 600, -50, 1500, 800',
    code: `READ n
READ is_member
total <- 0
points <- 0
invalid_count <- 0
FOR i <- 1 TO n DO
    READ amount
    IF amount <= 0 THEN
        invalid_count <- invalid_count + 1
    ELSE
        total <- total + amount
        IF amount >= 1000 THEN
            points <- points + 50
        ELSE IF amount >= 500 THEN
            points <- points + 20
        ELSE
            points <- points + 5
        ENDIF
        IF is_member THEN
            points <- points + 10
        ENDIF
    ENDIF
ENDFOR
IF total >= 3000 THEN
    points <- points + 100
ENDIF
WRITE total
WRITE points
WRITE invalid_count`,
  },
  {
    name: 'Counting: sum of n values — O(n)',
    inputs: '6',
    code: `READ n
total <- 0
FOR i <- 1 TO n DO
    total <- total + i
ENDFOR
WRITE total`,
  },
  {
    name: 'Counting: nested loops — O(n²)',
    inputs: '5',
    code: `READ n
pairs <- 0
FOR i <- 1 TO n DO
    FOR j <- 1 TO n DO
        pairs <- pairs + 1
    ENDFOR
ENDFOR
WRITE pairs`,
  },
  {
    name: 'Counting: repeated halving — O(log n)',
    inputs: '16',
    code: `READ n
count <- 0
WHILE n > 1 DO
    n <- n / 2
    count <- count + 1
ENDWHILE
WRITE count`,
  },
  {
    name: 'Counting: the loop that never grows',
    inputs: '50',
    code: `# The loop is bounded by 10, not by n.
# No matter how large n gets, the work stays the same.
READ n
count <- 0
FOR i <- 1 TO 10 DO
    count <- count + 1
ENDFOR
WRITE count`,
  },
  {
    name: 'Binary Search (Pseudocode 1-9)',
    inputs: '41',
    code: `values <- [3, 8, 15, 22, 34, 41, 50, 63, 72, 89]
n <- 10
READ target
low <- 0
high <- n - 1
WHILE low <= high DO
    mid <- (low + high) / 2
    IF values[mid] = target THEN
        WRITE "FOUND"
        STOP
    ELSE IF target < values[mid] THEN
        high <- mid - 1
    ELSE
        low <- mid + 1
    ENDIF
ENDWHILE
WRITE "NOT FOUND"`,
  },
];
