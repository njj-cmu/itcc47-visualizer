/*
 * GENERATED FILE — do not edit by hand.
 * Built from problems.public.json + problems.hidden.json by tools/build-problems.js
 *
 * Expected answers for hidden cases are stored only as salted, iterated
 * SHA-256 digests (4000 rounds). They are one-way: there is no key here
 * and nothing to decrypt. Hidden inputs are obfuscated, not encrypted.
 */
const PROBLEM_SCHEMA_VERSION = 1;
const PROBLEM_ROUNDS = 4000;
const PROBLEMS = [
  {
    "id": "sum-two",
    "title": "Sum of Two Numbers",
    "module": "Module 1",
    "checkpointId": "m1-ipo",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Warm-up",
    "contentVersion": 1,
    "statement": "Read two numbers and display their sum.",
    "rules": [
      [
        "Input",
        "Two numbers, one per READ, in the order given."
      ],
      [
        "Output",
        "A single number: the sum."
      ]
    ],
    "ioNote": "Display only the sum. No labels, no extra words.",
    "starter": "READ first_number\nREAD second_number\n",
    "salt": "2de3adf28a53bf93d2846f7a73dbecc3",
    "visibleTests": [
      {
        "inputs": [
          3,
          4
        ],
        "expected": [
          7
        ],
        "note": "the worked example"
      },
      {
        "inputs": [
          100,
          250
        ],
        "expected": [
          350
        ]
      }
    ],
    "hidden": [
      {
        "i": "PYRbow2Y",
        "n": 1,
        "h": "c7f2596a3f31c953cc149a81fe9783f6448e83feca5ce7e70588c6a96ef6d112"
      },
      {
        "i": "nTygKivczQ==",
        "n": 1,
        "h": "c91ace2984290ccd0db85496608f49b565dc346923816ab5f44260061f63a61a"
      },
      {
        "i": "gg9yEFysWg==",
        "n": 1,
        "h": "ade019a990eb0ca7dada8a8a6a14c4b3363649f3f0008b11f42829093e240784"
      },
      {
        "i": "5uXlcS/7",
        "n": 1,
        "h": "9cb839b04058ea45bdd44a53abda44790644310f21616396c3be07f534c4ad36"
      }
    ]
  },
  {
    "id": "delivery-fee",
    "title": "Delivery Fee",
    "module": "Module 1",
    "checkpointId": "m1-ipo",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 1,
    "statement": "A delivery service charges a fee based on how far the customer is from the store. The owner describes the rule in vague terms, so it has already been clarified into exact boundaries below. Premium customers get a discount, but only when the distance is valid.",
    "rules": [
      [
        "Distance is 0 or less",
        "Display INVALID and do nothing else."
      ],
      [
        "Distance is more than 0 but not more than 3",
        "Fee is 30."
      ],
      [
        "Distance is more than 3 but not more than 10",
        "Fee is 50."
      ],
      [
        "Distance is more than 10",
        "Fee is 80."
      ],
      [
        "Premium customer",
        "Subtract 10 from the fee, only after a valid fee has been set."
      ]
    ],
    "ioNote": "Input: the distance, then TRUE or FALSE for premium. Output: the fee, or exactly INVALID.",
    "starter": "READ distance\nREAD is_premium\n",
    "salt": "eb2af41d21db567cc87be34a5d1f1c77",
    "visibleTests": [
      {
        "inputs": [
          7,
          true
        ],
        "expected": [
          40
        ],
        "note": "7 km falls in the 50 band, then 10 off for premium"
      },
      {
        "inputs": [
          2,
          false
        ],
        "expected": [
          30
        ]
      },
      {
        "inputs": [
          0,
          true
        ],
        "expected": [
          "INVALID"
        ],
        "note": "invalid distance wins over the discount"
      }
    ],
    "hidden": [
      {
        "i": "mPZHJTbPKRE=",
        "n": 1,
        "h": "af59f8e574ad5c1f2bc8b452c231fc5280ccdcb090f877041cccb049c902d6a4"
      },
      {
        "i": "z1A6czrZ8LGk",
        "n": 1,
        "h": "d3b42f2050a78cbbaaaa5a3c5690b8f4d715921c2c657e9e40dc4d570f7728e2"
      },
      {
        "i": "TIMvqOWWEhW4jA==",
        "n": 1,
        "h": "d3b42f2050a78cbbaaaa5a3c5690b8f4d715921c2c657e9e40dc4d570f7728e2"
      },
      {
        "i": "i8OTSUq0c3Hd",
        "n": 1,
        "h": "d20281134fda856b13d9c572acd055176d0a46b35667e8b1120c8d78b0dbd862"
      },
      {
        "i": "mfY/QSU+rBobjw==",
        "n": 1,
        "h": "a5e647db7d4d43c63116e97c527d124dba712c16379e8148b110d06e257c8684"
      },
      {
        "i": "2N/EqxkRVXAl",
        "n": 1,
        "h": "d20281134fda856b13d9c572acd055176d0a46b35667e8b1120c8d78b0dbd862"
      },
      {
        "i": "YAsKEdJUGzXTLuw=",
        "n": 1,
        "h": "b62484a6e2658c92a085526d4076f720cfc4b0744d3885fdd58cf5c52b282942"
      }
    ]
  },
  {
    "id": "library-fine",
    "title": "Library Fine",
    "module": "Module 1",
    "checkpointId": "m1-pseudocode",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 1,
    "statement": "A library computes the fine for a borrowed book. The order in which you apply the rules changes the answer, so read them carefully before you start writing.",
    "rules": [
      [
        "Overdue days is negative",
        "Display INVALID and do nothing else."
      ],
      [
        "The book is lost",
        "The fine is exactly 500, whatever the overdue days."
      ],
      [
        "Otherwise",
        "The fine is overdue days times 10."
      ],
      [
        "Maximum overdue fine",
        "An overdue fine may not exceed 300."
      ],
      [
        "Library member",
        "Subtract 20 from the fine."
      ],
      [
        "Minimum fine",
        "The final fine may never be less than 0."
      ]
    ],
    "ioNote": "Input: overdue days, then TRUE/FALSE for lost, then TRUE/FALSE for member. Output: the fine, or exactly INVALID.",
    "starter": "READ overdue_days\nREAD book_lost\nREAD member\n",
    "salt": "8d5a8ed9a5376c25e87d30adc3440282",
    "visibleTests": [
      {
        "inputs": [
          50,
          false,
          true
        ],
        "expected": [
          280
        ],
        "note": "capped at 300 first, then the member discount"
      },
      {
        "inputs": [
          10,
          false,
          false
        ],
        "expected": [
          100
        ]
      },
      {
        "inputs": [
          5,
          true,
          true
        ],
        "expected": [
          500
        ],
        "note": "a lost book ignores the overdue calculation"
      }
    ],
    "hidden": [
      {
        "i": "zO77k0gHV9Z8fvf2Yfj3Vg==",
        "n": 1,
        "h": "f5eeef401fc946ec085728f72f687e9c92e77d1433face9c7083858e83787296"
      },
      {
        "i": "6757V0Q4kaSLB3/mRe4=",
        "n": 1,
        "h": "0f67981a997bdee19f4b922244a4539a579ece1924b3910a2fc2d976cb4ba0ab"
      },
      {
        "i": "6vwZhBBbUe4qpsbrNnivNA==",
        "n": 1,
        "h": "90fa0c8eabc9b790249f87f2cc8156e8c12703de9cef5f1c9d46fc288985ce79"
      },
      {
        "i": "y34DOqlkL38/hADDwu0=",
        "n": 1,
        "h": "0f67981a997bdee19f4b922244a4539a579ece1924b3910a2fc2d976cb4ba0ab"
      },
      {
        "i": "qfl/zrSH96pJaNnOwwfC",
        "n": 1,
        "h": "86b6ca4a7e0aa398cdec31786c319e716a631025398acaec497d902b103f5ff7"
      },
      {
        "i": "xB2Q26Vok+TgEZraewB5",
        "n": 1,
        "h": "49cffb2a24f3e9b2b9e9fd628e43f63fc2370e16eca4ce2c9a7713854c65b37a"
      },
      {
        "i": "LNMBqUsFbkcphp47tf8=",
        "n": 1,
        "h": "90fa0c8eabc9b790249f87f2cc8156e8c12703de9cef5f1c9d46fc288985ce79"
      }
    ]
  },
  {
    "id": "package-class",
    "title": "Package Classification",
    "module": "Module 1",
    "checkpointId": "m1-exact-io",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 1,
    "statement": "A delivery system classifies a package by weight, and marks express deliveries. The checker compares your output character for character, so the exact wording matters as much as the logic.",
    "rules": [
      [
        "Weight is 0 or less",
        "The result is INVALID."
      ],
      [
        "Weight is more than 0 but not more than 1",
        "The result is SMALL."
      ],
      [
        "Weight is more than 1 but not more than 5",
        "The result is REGULAR."
      ],
      [
        "Weight is more than 5",
        "The result is BULKY."
      ],
      [
        "Express and the weight is valid",
        "Add _EXPRESS to the end of the result."
      ],
      [
        "Express but the weight is invalid",
        "The result stays INVALID."
      ]
    ],
    "ioNote": "Input: the weight, then TRUE or FALSE for express. Output must be exactly one of: INVALID, SMALL, REGULAR, BULKY, SMALL_EXPRESS, REGULAR_EXPRESS, BULKY_EXPRESS.",
    "starter": "READ weight\nREAD express\n",
    "salt": "af394aa742113003f37e1830ac4a333e",
    "visibleTests": [
      {
        "inputs": [
          7,
          true
        ],
        "expected": [
          "BULKY_EXPRESS"
        ],
        "note": "the worked example"
      },
      {
        "inputs": [
          1,
          false
        ],
        "expected": [
          "SMALL"
        ]
      },
      {
        "inputs": [
          0,
          true
        ],
        "expected": [
          "INVALID"
        ],
        "note": "no _EXPRESS on an invalid package"
      }
    ],
    "hidden": [
      {
        "i": "CBtv8WTIu30Zh1Q8",
        "n": 1,
        "h": "6488da5d97603555b5f806f461189aa235ae47f9de3272dbc9377d26d8860240"
      },
      {
        "i": "9vuh5FvGvWk=",
        "n": 1,
        "h": "fc9c398964c7b77f67f336922e01f405ebb892b40e5629236414fd8525a16de8"
      },
      {
        "i": "ASLOC16DQ4g=",
        "n": 1,
        "h": "a67413335e55dc27efc9a210a34a922cb996f7775e20a839664c279ee8d33f44"
      },
      {
        "i": "wOmFnN6MwCLJ",
        "n": 1,
        "h": "cbdb1ca53c6652b0f195999e356ccedfaeeecde6704ff55ecff35488c16ce8cc"
      },
      {
        "i": "HYMQInca1GCzeNE=",
        "n": 1,
        "h": "25a22ea97e3e5e5ea7ea064d5d5b319eb7a37289c79654d038d190888ca90ca8"
      },
      {
        "i": "eixwZCt8VzRe",
        "n": 1,
        "h": "e19c8cb24a8db39b109f073023befbff56c18a43174324516c29bb364167390b"
      }
    ]
  },
  {
    "id": "parking-fee",
    "title": "Parking Fee",
    "module": "Module 1",
    "checkpointId": "m1-tracing",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 1,
    "statement": "A parking area computes a fee from the number of hours parked. The shape of this problem is the same as the library fine, so if you got that one right, check whether your ordering still holds here.",
    "rules": [
      [
        "Hours is negative",
        "Display INVALID and do nothing else."
      ],
      [
        "The ticket is lost",
        "The fee is exactly 500."
      ],
      [
        "Otherwise",
        "The fee is hours times 20."
      ],
      [
        "Maximum regular fee",
        "A regular parking fee may not exceed 200."
      ],
      [
        "Employee",
        "Subtract 40 from the fee."
      ],
      [
        "Minimum fee",
        "The final fee may never be less than 0."
      ]
    ],
    "ioNote": "Input: hours, then TRUE/FALSE for ticket lost, then TRUE/FALSE for employee. Output: the fee, or exactly INVALID.",
    "starter": "READ hours\nREAD ticket_lost\nREAD is_employee\n",
    "salt": "ba7016ba70b0f336d0937a6edc616e65",
    "visibleTests": [
      {
        "inputs": [
          15,
          false,
          true
        ],
        "expected": [
          160
        ],
        "note": "capped at 200 first, then the employee discount"
      },
      {
        "inputs": [
          3,
          false,
          false
        ],
        "expected": [
          60
        ]
      }
    ],
    "hidden": [
      {
        "i": "FfGN5SktM7PV2tLn1hc=",
        "n": 1,
        "h": "964ae4a534d309485b469a659fe75e73ba8f581d311260cb303a32f888837f66"
      },
      {
        "i": "xgkpivV4wAuLlrrfYYFs",
        "n": 1,
        "h": "2fb07217936ddfe849a34c8dea029c8f6c57dd124e2b7f33f7b68fe5839a342e"
      },
      {
        "i": "aMnwiTf0oNh7id0Z5Ts=",
        "n": 1,
        "h": "cd61e4e86a92b1d0321629803ae3cffb886829b23d51dedb1b8b9e1fd6da941d"
      },
      {
        "i": "rx8ZhJe+jqndSipEDn9A",
        "n": 1,
        "h": "6529041f7d8ffbe937d7cd7749221be3d8e2d6e4843f20388cfd43053a0d1d4d"
      },
      {
        "i": "yVrASsKinHPu1jWQYew=",
        "n": 1,
        "h": "964ae4a534d309485b469a659fe75e73ba8f581d311260cb303a32f888837f66"
      },
      {
        "i": "kSQmp68ThNKG1Ixd4QUvJw==",
        "n": 1,
        "h": "c0de779b2a0d799fe56e94cdc6d4518a22d32e98cd35671eb9a182d365f05470"
      }
    ]
  },
  {
    "id": "reward-points",
    "title": "Reward Points",
    "module": "Module 1",
    "checkpointId": "m1-complexity",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 1,
    "statement": "A store awards reward points across several purchases. You will need a loop, a running total, and a count of the purchases that were rejected. Read the number of purchases first, then the member flag, then each purchase amount in turn.",
    "rules": [
      [
        "Amount is 0 or less",
        "It is invalid: count it and award no points for it."
      ],
      [
        "Amount is 1000 or more",
        "Award 50 points."
      ],
      [
        "Amount is 500 or more but under 1000",
        "Award 20 points."
      ],
      [
        "Amount is under 500 but valid",
        "Award 5 points."
      ],
      [
        "Member",
        "Award 10 extra points for each valid purchase."
      ],
      [
        "Total of valid purchases is 3000 or more",
        "Award 100 bonus points at the very end."
      ]
    ],
    "ioNote": "Input: the number of purchases, then TRUE/FALSE for member, then that many amounts. Output three values in this order: the total of valid purchases, the reward points, then the number of invalid purchases.",
    "starter": "READ n\nREAD is_member\ntotal <- 0\npoints <- 0\ninvalid_count <- 0\n",
    "salt": "062dcd8d499fc33302064998bc2846e0",
    "visibleTests": [
      {
        "inputs": [
          5,
          true,
          200,
          600,
          -50,
          1500,
          800
        ],
        "expected": [
          3100,
          235,
          1
        ],
        "note": "the traced worked example"
      },
      {
        "inputs": [
          3,
          false,
          100,
          200,
          300
        ],
        "expected": [
          600,
          15,
          0
        ]
      }
    ],
    "hidden": [
      {
        "i": "ibGUTE3OGXmVBwL4gmyzhF5na5MU+cU=",
        "n": 3,
        "h": "c8ae65e27411da0496bc9b4317f0d69940c70e32f644a8fdc19aa682adcf19f8"
      },
      {
        "i": "y+mJi+AKxpCUUgI=",
        "n": 3,
        "h": "829b66b3d387143acedf45059a4bfa876a3e6851e9e06734c0434f119f0621c0"
      },
      {
        "i": "Uxu1DMuSBuhbOpk6pZC2W8FgWP8908xjK3I=",
        "n": 3,
        "h": "93ff8828a892833719e8502e516cdeb0a444c02f92eae645e511adee6702c2ee"
      },
      {
        "i": "qi37O9ONNLtT5ftf",
        "n": 3,
        "h": "0a846a04cc3c6d4255a8a38a12e83c0a2b5714595648e11ba00bf944ff0bfe78"
      },
      {
        "i": "7vY77W8MojgsUI44s5nfbg==",
        "n": 3,
        "h": "5d4ca3b30a257efc87d5d1c0c30617862dac7c3ae0a0b782562d8794d0212ecb"
      }
    ]
  },
  {
    "id": "array-total",
    "title": "Total of a List",
    "module": "Module 2",
    "checkpointId": "m2-arrays",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Warm-up",
    "contentVersion": 1,
    "statement": "Read how many numbers there are, then read that many numbers, and display their total. This is the pattern every later list problem is built on: read a count, then loop exactly that many times.",
    "rules": [
      [
        "Input",
        "First the count, then that many numbers, one per READ."
      ],
      [
        "Output",
        "A single number: the total."
      ],
      [
        "The count is 0",
        "There are no numbers to read. The total is 0."
      ]
    ],
    "ioNote": "Display only the total. No labels, no extra words.",
    "starter": "READ n\ntotal <- 0\n",
    "salt": "afddca481dd1406d3940b0c167eba726",
    "visibleTests": [
      {
        "inputs": [
          3,
          10,
          20,
          30
        ],
        "expected": [
          60
        ],
        "note": "three numbers, added in order"
      },
      {
        "inputs": [
          0
        ],
        "expected": [
          0
        ],
        "note": "no numbers at all — the loop must not run"
      }
    ],
    "hidden": [
      {
        "i": "rcvzUmk=",
        "n": 1,
        "h": "0f318ce251084f7e4653c2a5e0c1d92c1acdaf12a81a7499ddec4005760860be"
      },
      {
        "i": "i9H0Yt0333lG5hE3WB5W",
        "n": 1,
        "h": "2f1e4d6b56a6c897fc3755cdcf62603f45d27a6beda24b0a9335341c2049f32f"
      },
      {
        "i": "aHz2lMxLg+oTphrR",
        "n": 1,
        "h": "0369af46f3a797ab3ec6101735fe590ae11588443a7388db51a35787c20b79f6"
      },
      {
        "i": "2bN5tijVs4DjeJnIfA==",
        "n": 1,
        "h": "0f318ce251084f7e4653c2a5e0c1d92c1acdaf12a81a7499ddec4005760860be"
      },
      {
        "i": "Wdt067QhY8uq",
        "n": 1,
        "h": "0369af46f3a797ab3ec6101735fe590ae11588443a7388db51a35787c20b79f6"
      }
    ]
  },
  {
    "id": "largest-value",
    "title": "Largest in a List",
    "module": "Module 2",
    "checkpointId": "m2-arrays",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 1,
    "statement": "Read how many numbers there are, then read that many numbers, and display the largest. Think carefully about what the largest value starts as — a wrong starting value passes the obvious tests and fails the interesting ones.",
    "rules": [
      [
        "Input",
        "First the count, then that many numbers."
      ],
      [
        "The count is 0 or less",
        "Display INVALID and do nothing else."
      ],
      [
        "Otherwise",
        "Display the largest of the numbers."
      ],
      [
        "The largest value appears more than once",
        "Display it once."
      ]
    ],
    "ioNote": "Output: the largest value, or exactly INVALID.",
    "starter": "READ n\n",
    "salt": "efd7f1e338a96629c3268af4096d5635",
    "visibleTests": [
      {
        "inputs": [
          3,
          4,
          9,
          2
        ],
        "expected": [
          9
        ]
      },
      {
        "inputs": [
          0
        ],
        "expected": [
          "INVALID"
        ],
        "note": "nothing to compare"
      }
    ],
    "hidden": [
      {
        "i": "77zuTRq5",
        "n": 1,
        "h": "d955696e9d3c0aa1db46822e29d9fc00c60fa6cc16a4e57571a68e453a3b628f"
      },
      {
        "i": "QSiiHE6OyoPGGGlUPCJE",
        "n": 1,
        "h": "b1145ceb7333a9a563141c721370ef2ab1982f03a2cc135aed6e87c35da48ceb"
      },
      {
        "i": "DMcj8F9yMdiN",
        "n": 1,
        "h": "db9042aeb22e2301212399618d52076a0d74cd260bd963d87b628d1f6d0dadb9"
      },
      {
        "i": "7I8FB8Pk1ZkjtKQqaQ==",
        "n": 1,
        "h": "9fb3434b38ed0660ada88c87ed7860e35d0897a5e57daee5e592db7f66744ca9"
      },
      {
        "i": "SsS4NPEneP1xOt2Fwg==",
        "n": 1,
        "h": "9fb3434b38ed0660ada88c87ed7860e35d0897a5e57daee5e592db7f66744ca9"
      },
      {
        "i": "tosCArEFSYvo",
        "n": 1,
        "h": "c39c867b56998cbdb372c024ebb40fed14d5a1974fe2faf591c0262c0251c084"
      }
    ]
  },
  {
    "id": "linear-position",
    "title": "Position in a List",
    "module": "Module 2",
    "checkpointId": "m2-linear-search",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 1,
    "statement": "Read how many numbers there are, then that many numbers, and finally the value to look for. Display the position of the first match, counting from 1. Because the value to look for arrives last, you have to keep the numbers somewhere before you can search them.",
    "rules": [
      [
        "Input",
        "The count, then that many numbers, then the value to look for."
      ],
      [
        "Output",
        "The position of the first matching value, counting the first number as position 1."
      ],
      [
        "The value appears more than once",
        "Report the first position only."
      ],
      [
        "The value is not there",
        "Display exactly NOT FOUND."
      ]
    ],
    "ioNote": "Output: a position number, or exactly NOT FOUND.",
    "starter": "READ n\nvalues <- []\n",
    "salt": "fee6236aa05fd8503b4a4df0413c2c9d",
    "visibleTests": [
      {
        "inputs": [
          4,
          10,
          20,
          30,
          40,
          30
        ],
        "expected": [
          3
        ],
        "note": "30 is the third number"
      },
      {
        "inputs": [
          3,
          1,
          2,
          3,
          9
        ],
        "expected": [
          "NOT FOUND"
        ]
      }
    ],
    "hidden": [
      {
        "i": "wdP06+MsFw==",
        "n": 1,
        "h": "fc965f466db1474c1c5f7c3053002a10f7a4a78dc9b99dc3140a8dd25e5d2e68"
      },
      {
        "i": "g7AF9GI6q+E60hy553Q9",
        "n": 1,
        "h": "fc965f466db1474c1c5f7c3053002a10f7a4a78dc9b99dc3140a8dd25e5d2e68"
      },
      {
        "i": "oXjyspd9pat6Cj//8A==",
        "n": 1,
        "h": "a3cdf79d7ea83c366e96839ae1301bedd85305487c912fd4e2c15d18551f605c"
      },
      {
        "i": "1OZripn7mdmdkqIzVQZd",
        "n": 1,
        "h": "6aca4ee23a58317dca802561db1d55fe4d4eed52cbd5c983c5c965f4feb668d6"
      },
      {
        "i": "DJDg1o0=",
        "n": 1,
        "h": "d10f82d759477f1838ae28bb1781d8d5b89093010e1355edf1eb6778ab1481de"
      },
      {
        "i": "HwURahpwDvXO",
        "n": 1,
        "h": "fc965f466db1474c1c5f7c3053002a10f7a4a78dc9b99dc3140a8dd25e5d2e68"
      },
      {
        "i": "gLf6Vo+HvwRNuYX1Cibi",
        "n": 1,
        "h": "8330bbd60ca9b7d0a6434805ab29981155d29eee67e3655c89e94f76b073bfff"
      },
      {
        "i": "6zHGRMmjhfKcHizm1RIuHoE=",
        "n": 1,
        "h": "fc965f466db1474c1c5f7c3053002a10f7a4a78dc9b99dc3140a8dd25e5d2e68"
      }
    ]
  },
  {
    "id": "above-average",
    "title": "Above the Average",
    "module": "Module 2",
    "checkpointId": "m2-arrays",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 1,
    "statement": "Read how many numbers there are, then that many numbers. Display the average, then how many of the numbers are above it. You cannot know the average until you have seen every number, so this one cannot be done in a single pass.",
    "rules": [
      [
        "Input",
        "The count, then that many numbers. Every number is 0 or more."
      ],
      [
        "The count is 0 or less",
        "Display INVALID and do nothing else."
      ],
      [
        "Average",
        "The total divided by the count, using whole-number division. Drop any remainder."
      ],
      [
        "Output",
        "Two values in this order: the average, then how many numbers are strictly greater than it."
      ]
    ],
    "ioNote": "Output two values, the average then the count. Or exactly INVALID.",
    "starter": "READ n\nvalues <- []\ntotal <- 0\n",
    "salt": "bc1b632db7796d56f6550d0fb8e48b8b",
    "visibleTests": [
      {
        "inputs": [
          4,
          10,
          20,
          30,
          40
        ],
        "expected": [
          25,
          2
        ],
        "note": "average 25; 30 and 40 are above it"
      },
      {
        "inputs": [
          0
        ],
        "expected": [
          "INVALID"
        ]
      }
    ],
    "hidden": [
      {
        "i": "zHU8OCY=",
        "n": 2,
        "h": "9fe6f7b93fabfe55f64b0c82c131aaf663b60d5844571a1e4e85c383c4b0beea"
      },
      {
        "i": "TxELaQSy9e7i",
        "n": 2,
        "h": "d6e60d15b97033c22e06228d79a30d431515909e56f6146290c201b3a55ca178"
      },
      {
        "i": "3pUg14sUDGFcwczoO1Y=",
        "n": 2,
        "h": "bea78184ead865981adfedbaa90ec7354908b6695a97c4656bfc71ed322b4073"
      },
      {
        "i": "kSUP9UV22w==",
        "n": 2,
        "h": "7d0c408929b062c6ed81995135b6705a4469e24490159c9198c1172ee0305cc5"
      },
      {
        "i": "3O9HVclML2qPzuA=",
        "n": 2,
        "h": "65beea05a5917a61c8c31bf849d6dc27dfa388d5c454cefcd96eb45e91262b9c"
      },
      {
        "i": "9H1rpqlYoWZCYg==",
        "n": 2,
        "h": "4980d7fd88a6effdf55fa9e9026cb09dd3ba080779541065ee9daff20151183c"
      }
    ]
  },
  {
    "id": "has-duplicate",
    "title": "Any Repeats?",
    "module": "Module 2",
    "checkpointId": "m2-arrays",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 1,
    "statement": "Read how many numbers there are, then that many numbers. Display YES if any number appears more than once, and NO if every number is different. Comparing every number against every other one is the straightforward approach — notice how much work that becomes as the list grows.",
    "rules": [
      [
        "Input",
        "The count, then that many numbers."
      ],
      [
        "Any number appears more than once",
        "Display exactly YES."
      ],
      [
        "Every number is different",
        "Display exactly NO."
      ],
      [
        "Fewer than two numbers",
        "Nothing can repeat, so display NO."
      ]
    ],
    "ioNote": "Output exactly YES or exactly NO.",
    "starter": "READ n\nvalues <- []\n",
    "salt": "2e30f7af7dce12448e730ec8d19d017b",
    "visibleTests": [
      {
        "inputs": [
          4,
          1,
          2,
          3,
          2
        ],
        "expected": [
          "YES"
        ],
        "note": "2 appears twice"
      },
      {
        "inputs": [
          3,
          1,
          2,
          3
        ],
        "expected": [
          "NO"
        ]
      }
    ],
    "hidden": [
      {
        "i": "Iqiz",
        "n": 1,
        "h": "8379346a6cd557775932a75042efe82149fd1f3dfb73711b06115e2b9b3feee4"
      },
      {
        "i": "M5rfjys=",
        "n": 1,
        "h": "8379346a6cd557775932a75042efe82149fd1f3dfb73711b06115e2b9b3feee4"
      },
      {
        "i": "Q3jYNFNlqg==",
        "n": 1,
        "h": "5deecc7051bf73d5a2fbe013266fef17fe6920069e23c5c7427345410be6a742"
      },
      {
        "i": "9OTqkEXAWVserlrJ5w==",
        "n": 1,
        "h": "5deecc7051bf73d5a2fbe013266fef17fe6920069e23c5c7427345410be6a742"
      },
      {
        "i": "rw442E3VM08fRcZsgKc=",
        "n": 1,
        "h": "5deecc7051bf73d5a2fbe013266fef17fe6920069e23c5c7427345410be6a742"
      },
      {
        "i": "teBpK7BL64vWjbl8LKq5",
        "n": 1,
        "h": "8379346a6cd557775932a75042efe82149fd1f3dfb73711b06115e2b9b3feee4"
      }
    ]
  },
  {
    "id": "binary-checks",
    "title": "Binary Search, Counted",
    "module": "Module 2",
    "checkpointId": "m2-binary-search",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 1,
    "statement": "Read how many numbers there are, then that many numbers already in ascending order, then the value to look for. Display whether it was found, and how many middle values you had to examine. Compare that count against the length of the list — that gap is the whole reason binary search matters.",
    "rules": [
      [
        "Input",
        "The count, then that many numbers in ascending order, then the value to look for."
      ],
      [
        "Method",
        "Look at the middle of the range that is left. If it matches, stop. Otherwise discard the half that cannot contain the value."
      ],
      [
        "Counting",
        "Add one every time you examine a middle value, including the one that matches."
      ],
      [
        "Output",
        "Two values in this order: exactly FOUND or exactly NOT FOUND, then how many middle values were examined."
      ]
    ],
    "ioNote": "Output FOUND or NOT FOUND, then the number of middle values examined.",
    "starter": "READ n\nvalues <- []\n",
    "salt": "cf6867867673e1c20231300fea266ce3",
    "visibleTests": [
      {
        "inputs": [
          7,
          3,
          8,
          15,
          22,
          34,
          41,
          50,
          41
        ],
        "expected": [
          "FOUND",
          2
        ],
        "note": "middle is 22, then 41"
      },
      {
        "inputs": [
          7,
          3,
          8,
          15,
          22,
          34,
          41,
          50,
          5
        ],
        "expected": [
          "NOT FOUND",
          3
        ]
      }
    ],
    "hidden": [
      {
        "i": "3JCLzr7qew==",
        "n": 2,
        "h": "aa8305352b7961db4033202d41a9531b2995d88aba8f836c5b2f0d130099d3b8"
      },
      {
        "i": "wtmC/1A=",
        "n": 2,
        "h": "dd46f9a0e0b12f89deb72faaf3aa7caaa4717f53b1c65c1512d7c41789d63988"
      },
      {
        "i": "qRm9TxW3d001EUhl/Jqf7frqO2r2",
        "n": 2,
        "h": "50476015420f6ede537f495f98ac7da9fedc8fe86947dcd38282966e4ee0256c"
      },
      {
        "i": "0MwqHHHzIPjymxSuJqc1A8IcCQgQ",
        "n": 2,
        "h": "f5b3ae65231062ea6a043c1313b7d6975189cc11d892d079245f2b6d4ade9ff5"
      },
      {
        "i": "XQPLsAE9pqUMeSB/iPP4",
        "n": 2,
        "h": "f7a1c086f293807115e7d2014e4de9e2f4e9c76b40461481469a3f8785fdf740"
      },
      {
        "i": "SOptjF4sXsfL",
        "n": 2,
        "h": "088cda0880cc11a843c81c68eed5feb249d2b0a43a96d317c439a5f52906d0d5"
      }
    ]
  },
  {
    "id": "CH01-PS01",
    "title": "Edge Gateway Request Admission",
    "module": "Module 1",
    "checkpointId": "m1-pseudocode",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Medium",
    "contentVersion": 1,
    "statement": "An edge gateway must classify one incoming packet. Validation always happens first, permanently blocked TCP ports cannot be bypassed, and maintenance mode changes which otherwise-valid traffic may pass. Translate the precedence into one deterministic decision that produces exactly one result.",
    "rules": [
      [
        "Input",
        "Read protocol, port, packet size, authenticated, then maintenance mode."
      ],
      [
        "Invalid packet",
        "INVALID if protocol is not TCP, UDP, or ICMP; size is outside 1..1500; TCP/UDP port is outside 1..65535; or ICMP port is not 0."
      ],
      [
        "Permanently blocked",
        "Valid TCP traffic on port 23 or 445 is BLOCKED, even when authenticated."
      ],
      [
        "Maintenance mode",
        "Block TCP and UDP, except authenticated TCP on port 22. Valid ICMP is allowed."
      ],
      [
        "Privileged port",
        "Outside maintenance, TCP/UDP ports below 1024 require authentication."
      ],
      [
        "Default",
        "Any other valid packet is ALLOW."
      ],
      [
        "Complexity",
        "Expected worst case: O(1), because the number of checks is fixed."
      ]
    ],
    "ioNote": "Output exactly one of INVALID, BLOCKED, AUTH_REQUIRED, or ALLOW. No labels or explanation.",
    "starter": "READ protocol\nREAD port\nREAD packet_size\nREAD authenticated\nREAD maintenance_mode\n",
    "salt": "b3e03c3e2b0cecd627b8557137188e66",
    "visibleTests": [
      {
        "inputs": [
          "TCP",
          22,
          1200,
          true,
          true
        ],
        "expected": [
          "ALLOW"
        ],
        "note": "the authenticated maintenance exception"
      },
      {
        "inputs": [
          "ICMP",
          80,
          64,
          true,
          false
        ],
        "expected": [
          "INVALID"
        ],
        "note": "ICMP must use port 0"
      }
    ],
    "hidden": [
      {
        "i": "N3uRjW42RTmThuJ2GDACGWNlZ4PhyTpKO6QJ",
        "n": 1,
        "h": "d8038131f237d9905434e44b785671b11153f6375e72599b1ea0b29031bcee42"
      },
      {
        "i": "7M/MVb6+t9I+teETTBgWfItK8FJGScc=",
        "n": 1,
        "h": "d8038131f237d9905434e44b785671b11153f6375e72599b1ea0b29031bcee42"
      },
      {
        "i": "nupF6Ni2rwUWKTbM6LeBA9nqtRWOtgEZ/A==",
        "n": 1,
        "h": "62c70c2be91208925c8c1fcd8ce0f9c0abfec3508673e0c17914e5beb55ed0bb"
      },
      {
        "i": "trNhalyKludLpcedoiGjueM7wbbvLjDocg==",
        "n": 1,
        "h": "62c70c2be91208925c8c1fcd8ce0f9c0abfec3508673e0c17914e5beb55ed0bb"
      },
      {
        "i": "/MrDrr+41nqrvhMSnGqMIaEL79AV9lbnWfU=",
        "n": 1,
        "h": "08108a07ca425e755dd6303b68c603b919bcb3cfe999bf6dc77a808b88ffb2de"
      },
      {
        "i": "Hno2Ji6G1/G3rQc+qPwQ1ALzMU/J/hkvDg==",
        "n": 1,
        "h": "62c70c2be91208925c8c1fcd8ce0f9c0abfec3508673e0c17914e5beb55ed0bb"
      },
      {
        "i": "RKi7sJ/YxYMP3w6ilG1oa8GJBmc/h9ws+Ds=",
        "n": 1,
        "h": "2c4315fdc7f88b0dd1cc2b475fac8fc810039ea92dd4cec5a6bcb8de66857212"
      },
      {
        "i": "+L2ULJe67uUb1dTDBvTk/kG1xcmgMTDOrlE=",
        "n": 1,
        "h": "2c4315fdc7f88b0dd1cc2b475fac8fc810039ea92dd4cec5a6bcb8de66857212"
      }
    ]
  },
  {
    "id": "CH01-PS02",
    "title": "API Gateway Billing and SLA Audit",
    "module": "Module 1",
    "checkpointId": "m1-tracing",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Medium-Hard",
    "contentVersion": 1,
    "statement": "Process a batch of API request records. Invalid records must be counted and skipped before they can affect billing or SLA totals. Valid records may affect billing, server-error, and slow-request counters independently.",
    "rules": [
      [
        "Input",
        "Read n, then for each request read status code, payload KB, latency ms, and cache hit."
      ],
      [
        "Invalid record",
        "Status outside 200..599, negative payload, or negative latency: increment invalid count and skip every other rule."
      ],
      [
        "Status 200..399",
        "Charge 1 unit for 0..64 KB, 2 for 65..256 KB, or 4 above 256 KB. A cache hit subtracts 1, but the charge stays at least 1."
      ],
      [
        "Status 400..499",
        "Charge exactly 1 unit; ignore the cache flag."
      ],
      [
        "Status 500..599",
        "Charge 0 and increment server error count."
      ],
      [
        "SLA",
        "Every valid request over 750 ms is slow. NO_DATA if none are valid; BREACH if more than 20% are slow; otherwise OK."
      ],
      [
        "Complexity",
        "Expected worst case: O(n), with fixed work for each request."
      ]
    ],
    "ioNote": "Output four values in order: billing units, server error count, invalid count, then SLA status.",
    "starter": "READ n\nbilling_units <- 0\nserver_error_count <- 0\ninvalid_count <- 0\nvalid_count <- 0\nslow_count <- 0\n",
    "salt": "f6761f3c95a6dcaf04e3f5f81a282480",
    "visibleTests": [
      {
        "inputs": [
          6,
          200,
          32,
          200,
          false,
          200,
          200,
          900,
          true,
          404,
          10,
          100,
          false,
          503,
          0,
          1200,
          false,
          700,
          10,
          20,
          false,
          201,
          300,
          500,
          false
        ],
        "expected": [
          7,
          1,
          1,
          "BREACH"
        ],
        "note": "invalid records affect neither billing nor SLA"
      },
      {
        "inputs": [
          2,
          500,
          0,
          100,
          false,
          204,
          0,
          750,
          true
        ],
        "expected": [
          1,
          1,
          0,
          "OK"
        ]
      }
    ],
    "hidden": [
      {
        "i": "ZI04",
        "n": 4,
        "h": "422b9a09ce1ef8c2682935fbcde026c9bf619da84d0409aa667b03f7373229b6"
      },
      {
        "i": "MLNA6Of3PFxOW0gnBY5iN6idtg==",
        "n": 4,
        "h": "b1954044260eb04e610affa6d32d1e4b7b31c562d3afc2445dbcca6328a5e46e"
      },
      {
        "i": "pOg0+76G+GpFCaI4rtC13QlXSJeG28RConFO7hmq3iULyDkVrHKC1B5XEz3UbmoUajXrZ30yWrRS/5JDDr9UVNTHY1jXOl+Q+OFe4GsUusXx9+Y=",
        "n": 4,
        "h": "cfa9c55ae944af6603db5136d6e6098a3336c6fe41ba23a636ca9d79a10f21ae"
      },
      {
        "i": "AbtU0U0AkZp8y9bX4bh31Zo=",
        "n": 4,
        "h": "ff3c274544e69134fc397507a926fb09c439b0bbcd074a37738de6d362c3ac8c"
      },
      {
        "i": "0ajnSqDOu4UxbgX9gJeM2JaaN9tCAnrKrFn2SgJJ2eU3qe4=",
        "n": 4,
        "h": "f0696824dacc62103f1c39d0982f6b6a676dfdc6439b37071318d202c5bb4e3a"
      },
      {
        "i": "QMD5AeQLjHSZLuR2a4EX854HzpAA5qL0KbHN6XeC+myYR8KgksOneK+pxcnq5IHuNno8uQ==",
        "n": 4,
        "h": "231093c5d6cb2dfa623cad613b16d1ef4e2e6602d478f7b51bfd1ffa62976efb"
      }
    ]
  },
  {
    "id": "CH01-PS03",
    "title": "Authentication Risk and Automatic Lockout",
    "module": "Module 1",
    "checkpointId": "m1-tracing",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Hard",
    "contentVersion": 1,
    "statement": "Examine authentication events for one account while maintaining risk, consecutive failures, invalid events, and the number of records actually read. A lockout stops input processing immediately, so unread events must never affect the result.",
    "rules": [
      [
        "Event 1: SUCCESS",
        "Reset consecutive failures and subtract 2 risk, without allowing risk below 0."
      ],
      [
        "Event 2: PASSWORD_FAIL",
        "Add 1 consecutive failure and 2 risk."
      ],
      [
        "Event 3: MFA_FAIL",
        "Add 1 consecutive failure and 3 risk."
      ],
      [
        "Event 4: TIMEOUT",
        "Reset consecutive failures and add 1 risk."
      ],
      [
        "Invalid event",
        "Increment invalid count; do not change risk or the current failure streak."
      ],
      [
        "Lockout",
        "After a valid event, lock when failures reach 3 or risk reaches 7, then stop reading."
      ],
      [
        "Complexity",
        "Expected worst case: O(n). Early lockout can reduce a particular run, not the worst case."
      ]
    ],
    "ioNote": "Output status (OPEN or LOCKED), processed count, risk score, then invalid count.",
    "starter": "READ n\nrisk_score <- 0\nconsecutive_failures <- 0\ninvalid_count <- 0\nprocessed_count <- 0\nstatus <- \"OPEN\"\n",
    "salt": "a55ae9f9f05d8474cb7dd14d91a6bd4a",
    "visibleTests": [
      {
        "inputs": [
          8,
          2,
          9,
          3,
          4,
          2,
          1,
          2,
          3
        ],
        "expected": [
          "LOCKED",
          5,
          8,
          1
        ],
        "note": "processing stops as soon as risk reaches the threshold"
      },
      {
        "inputs": [
          4,
          2,
          1,
          4,
          9
        ],
        "expected": [
          "OPEN",
          4,
          1,
          1
        ]
      }
    ],
    "hidden": [
      {
        "i": "6T6XPmSCLf0E1GlkkQ==",
        "n": 4,
        "h": "a7fc41de7fe8a4a1684cec044c91a6d2ead46134feca8d6140187a95b3aecbde"
      },
      {
        "i": "wjiPkLZkbf99Njdm7A==",
        "n": 4,
        "h": "e5069ae27e21cad345405cc90399e02893f75c875977c4c2f6c9c6fc3374b5e0"
      },
      {
        "i": "JuYIJgIzDnUc",
        "n": 4,
        "h": "78bb7e6f378bdd236b5e8f6adeaa22279b11001ab7def1434f131440dfd47fc6"
      },
      {
        "i": "ZZ1O",
        "n": 4,
        "h": "9eaf92ffcd6f8b4c4716a49ca149afc6b29e9a833bec878cb2301db4197174a6"
      },
      {
        "i": "CHS++bVcrMrhaiQ=",
        "n": 4,
        "h": "7da37b69a307a6746a9ba96274a9c614a857fe36bb2952e2ea9a8a0a83e4c65c"
      },
      {
        "i": "Oben9ftXIbdRic/LIlP1",
        "n": 4,
        "h": "aec6edc77ef72401112f99bf083aa88add77179fa8eb957f7d9e8ab588dc3fe1"
      }
    ]
  },
  {
    "id": "CH01-PS04",
    "title": "Container Deployment Admission Controller",
    "module": "Module 1",
    "checkpointId": "m1-exact-io",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Hard",
    "contentVersion": 1,
    "statement": "Process deployment requests against a cluster's remaining resources. Each request passes through validation, image security, workload configuration, and capacity checks. Resource state changes only when the complete deployment is accepted.",
    "rules": [
      [
        "Input",
        "Read available CPU, available memory, n, then workload type, replicas, CPU per replica, memory per replica, and signed image for each request."
      ],
      [
        "Invalid",
        "Type outside 1..3 or any non-positive replica/resource value increments invalid count and skips the request."
      ],
      [
        "Security",
        "A valid unsigned image increments security rejected and skips capacity work."
      ],
      [
        "Overhead",
        "Per replica: WEB adds 1 CPU/128 MB; WORKER adds 2 CPU/256 MB; DATABASE adds 2 CPU/512 MB."
      ],
      [
        "Database configuration",
        "DATABASE base memory below 1024 MB increments config rejected."
      ],
      [
        "Capacity",
        "Accept only when both complete CPU and memory requirements fit. Never partially deploy or partially subtract resources."
      ],
      [
        "Complexity",
        "Expected worst case: O(n), with one fixed decision pipeline per request."
      ]
    ],
    "ioNote": "First output line: accepted security_rejected config_rejected capacity_rejected invalid. Second line: remaining_cpu remaining_memory.",
    "starter": "READ available_cpu\nREAD available_memory\nREAD n\naccepted_count <- 0\nsecurity_reject_count <- 0\nconfig_reject_count <- 0\ncapacity_reject_count <- 0\ninvalid_count <- 0\n",
    "salt": "bd88360a88b513e08c9a50faee4d55b5",
    "visibleTests": [
      {
        "inputs": [
          40,
          8192,
          5,
          1,
          2,
          3,
          512,
          true,
          3,
          2,
          4,
          1024,
          true,
          2,
          3,
          4,
          512,
          false,
          3,
          1,
          2,
          512,
          true,
          1,
          5,
          4,
          700,
          true
        ],
        "expected": [
          "2 1 1 1 0",
          "20 3840"
        ],
        "note": "only complete approved deployments consume resources"
      },
      {
        "inputs": [
          10,
          1024,
          1,
          1,
          1,
          2,
          256,
          true
        ],
        "expected": [
          "1 0 0 0 0",
          "7 640"
        ]
      }
    ],
    "hidden": [
      {
        "i": "41pHSEgCZZJiCPcetuccg0ldeEGdTxyP",
        "n": 2,
        "h": "6fb8393d66ca6ec06721d983b118a8837a36e7f1d208d86d361c48fe675a0d58"
      },
      {
        "i": "MpliMvig0/EVRlLxWOJ8WCeDeqHB4AfS6A==",
        "n": 2,
        "h": "56064bb31ba8c9d2da5aff1d83251913eb3d78e2278f6cce6e01b8ac90e66302"
      },
      {
        "i": "BdF40LzqalglafX8hpKgii0BbOeZSgPknQAS",
        "n": 2,
        "h": "83c5c4d4ffb38daa6aa0354d9f6842943d13fef069743c1cafb737ab4bf34695"
      },
      {
        "i": "ZcHbBrxRTAbfEeQNGVBfg+0RMBbKqS7v",
        "n": 2,
        "h": "0d8b3b9dbac409e57bb9f8ff034c96ce74355bac76ab2409edab09c4f1d3601b"
      },
      {
        "i": "LNeRlMN6k+1v/sD/OlSdzBzsP36KVjKdKw==",
        "n": 2,
        "h": "40dd63ef3a6aea03a8c8f93f2c1e91a6cc5699d09b807ae6463f2da25067d576"
      },
      {
        "i": "bEmHxD99Cj5P+vpHnHq8wCJCw59D+u/ayg4oqepUnKNt8/iJXl4Yug==",
        "n": 2,
        "h": "d956c11e727fbfd14cba25efe08bbaaf4f4bc41119f407637384cb7a88be73e9"
      }
    ]
  },
  {
    "id": "CH01-PS05",
    "title": "Binary Fault Isolation Under a Probe Budget",
    "module": "Module 1",
    "checkpointId": "m1-complexity",
    "cloIds": [
      1,
      2,
      3
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Medium-Hard",
    "contentVersion": 1,
    "statement": "Repeatedly halve a set of candidate nodes while respecting both a probe budget and a timeout. A probe may begin only when every stopping condition allows it; odd candidate counts must round upward.",
    "rules": [
      [
        "Invalid",
        "INVALID when candidates <= 0, max probes < 0, probe time <= 0, or timeout < 0."
      ],
      [
        "Probe condition",
        "Continue only while candidates > 1, probes remain, and one more probe fits within the timeout."
      ],
      [
        "Probe update",
        "Replace candidates with (candidates + 1) DIV 2, then increment probes and elapsed time."
      ],
      [
        "Result",
        "ISOLATED only when one candidate remains; otherwise UNRESOLVED."
      ],
      [
        "Complexity",
        "Expected behavior is O(log n) when budgets are sufficient because each probe removes about half."
      ]
    ],
    "ioNote": "For valid input output status, probes used, remaining candidates, then elapsed time. For invalid input output only INVALID.",
    "starter": "READ candidates\nREAD max_probes\nREAD probe_time_ms\nREAD timeout_ms\n",
    "salt": "4ab186299af1251d541920012cae1ed7",
    "visibleTests": [
      {
        "inputs": [
          1000,
          20,
          120,
          1000
        ],
        "expected": [
          "UNRESOLVED",
          8,
          4,
          960
        ],
        "note": "a ninth probe would exceed the timeout"
      },
      {
        "inputs": [
          9,
          4,
          25,
          100
        ],
        "expected": [
          "ISOLATED",
          4,
          1,
          100
        ]
      }
    ],
    "hidden": [
      {
        "i": "msgUo+ui8wLwUzY=",
        "n": 1,
        "h": "b96669a59362950d0ee8fab5b61928cda42fff30d09eb3248f513883051a3b3e"
      },
      {
        "i": "yGOJXXcKvlAQKQ==",
        "n": 4,
        "h": "e0c9941e49e4bebf2b4a18dc4639d5f753f74898e7081f847987e5ae46a8abd8"
      },
      {
        "i": "KWfh8e2uLnpq09vaJw==",
        "n": 4,
        "h": "4b309b355afa5de2868fa64743db43d99d499fac18de5f8128602673207fc200"
      },
      {
        "i": "YGPYjK7GsKMBpi8d",
        "n": 4,
        "h": "02a6e1e946f20ab2672cfd18a80a30d060051b5ab185be1636148e58fdd01d41"
      },
      {
        "i": "HObVHarNJnI2",
        "n": 4,
        "h": "c36fac1fac7aed47df3e104240554eb058c84290b876956ee07a1df1cdf5947d"
      },
      {
        "i": "+518gKY8ijMTng==",
        "n": 4,
        "h": "b81fd6dbd4fa3f56f460cdc81edf7c753a64633c193200aef1d40a1a34ed0688"
      },
      {
        "i": "FRmpFtAu5W5RTCCu6Q==",
        "n": 1,
        "h": "b96669a59362950d0ee8fab5b61928cda42fff30d09eb3248f513883051a3b3e"
      }
    ]
  },
  {
    "id": "bubble-pass",
    "title": "One Complete Bubble Pass",
    "module": "Module 2",
    "checkpointId": "m2-bubble-sort",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 1,
    "statement": "Perform exactly one left-to-right Bubble Sort pass and output the resulting array.",
    "rules": [
      [
        "Comparison",
        "For every adjacent pair, swap only when values[j] > values[j + 1]."
      ],
      [
        "Boundary",
        "Visit j from 0 through LENGTH(values) - 2."
      ],
      [
        "Output",
        "Write the complete array after the pass."
      ]
    ],
    "ioNote": "Read one array and write one array.",
    "starter": "READ values\nFOR j <- 0 TO LENGTH(values) - 2 DO\n    # compare the adjacent pair\nENDFOR\nWRITE values",
    "salt": "a93b07f837fb66c0b212a85683400a6e",
    "visibleTests": [
      {
        "inputs": [
          [
            1,
            4,
            2,
            5
          ]
        ],
        "expected": [
          [
            1,
            4,
            2,
            5
          ]
        ],
        "note": "the largest value reaches the pass boundary"
      },
      {
        "inputs": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": [
          [
            1,
            2,
            3
          ]
        ]
      },
      {
        "inputs": [
          []
        ],
        "expected": [
          []
        ],
        "note": "an empty pass performs no comparison"
      }
    ],
    "hidden": [
      {
        "i": "a6zCiNPICYVUzj0=",
        "n": 1,
        "h": "42a296228367703f16eb5d0a812dc486dc391435c093e187fb58ff07a447dc1d"
      },
      {
        "i": "02Yyf/kIJw30",
        "n": 1,
        "h": "d4d819d28ad491748885cd104a9554df71fa39ba61af5fd9fb645d3da4ab2b1a"
      },
      {
        "i": "tf2pvMHPLjTjFv8=",
        "n": 1,
        "h": "004a0f4e6b9d8684d74239a08c93d30c661469ec3a3549312a692c9b9ee7b7c2"
      }
    ]
  },
  {
    "id": "selection-minimum",
    "title": "Select the Minimum Index",
    "module": "Module 2",
    "checkpointId": "m2-selection-sort",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 1,
    "statement": "Scan an array exactly as Selection Sort scans one unsorted region and output the index of its first minimum, or -1 for an empty array.",
    "rules": [
      [
        "Candidate",
        "Initialize minIndex to 0 only when the array is nonempty."
      ],
      [
        "Tie",
        "Update minIndex only for a strictly smaller value, preserving the first minimum."
      ],
      [
        "Output",
        "Write one zero-based index, or -1."
      ]
    ],
    "ioNote": "Read one array. Output one integer.",
    "starter": "READ values\nIF LENGTH(values) = 0 THEN\n    WRITE -1\nELSE\n    minIndex <- 0\n    # scan the remaining candidates\nENDIF",
    "salt": "2f910a12f2f95dce17d5b4085121eba8",
    "visibleTests": [
      {
        "inputs": [
          [
            7,
            3,
            5,
            3
          ]
        ],
        "expected": [
          1
        ],
        "note": "equal minima do not replace the first candidate"
      },
      {
        "inputs": [
          [
            9
          ]
        ],
        "expected": [
          0
        ]
      },
      {
        "inputs": [
          []
        ],
        "expected": [
          -1
        ]
      }
    ],
    "hidden": [
      {
        "i": "eHTGr6eEs+g5rQIKVw==",
        "n": 1,
        "h": "eda0c2ac17bafc813425e11a9c3d817b0ee28f4f0fcf3a6f4d0affc0b8d2493f"
      },
      {
        "i": "h90flSbqBTFZ",
        "n": 1,
        "h": "beaf7029371d0d6721932ab9dd269d49ac36b337ab28a4a6f4388427d28cf932"
      },
      {
        "i": "Rn3a0kjtUQ==",
        "n": 1,
        "h": "ea4a1e5f7278a17f6ecd2f7b31d4fa3e2865191973dad18246cd379743268017"
      }
    ]
  },
  {
    "id": "stable-ticket-insertion",
    "title": "Stable Ticket Insertion",
    "module": "Module 2",
    "checkpointId": "m2-insertion-sort",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 1,
    "statement": "Insertion-sort parallel priority and identity arrays. Shift both fields together and preserve the arrival order of equal priorities.",
    "rules": [
      [
        "Record identity",
        "priorities[i] and identities[i] describe one record and always move together."
      ],
      [
        "Stability",
        "Shift only when the previous priority is strictly greater than the key priority."
      ],
      [
        "Output",
        "Write sorted priorities, then sorted identities."
      ]
    ],
    "ioNote": "Read priorities and identities as two arrays of equal length.",
    "starter": "READ priorities\nREAD identities\nFOR i <- 1 TO LENGTH(priorities) - 1 DO\n    keyPriority <- priorities[i]\n    keyIdentity <- identities[i]\n    # shift complete records, then insert the key\nENDFOR\nWRITE priorities\nWRITE identities",
    "salt": "5a19555d4511a1d8960ad7a308f8a3c9",
    "visibleTests": [
      {
        "inputs": [
          [
            1,
            1,
            2,
            2
          ],
          [
            "B",
            "D",
            "A",
            "C"
          ]
        ],
        "expected": [
          [
            1,
            1,
            2,
            2
          ],
          [
            "B",
            "D",
            "A",
            "C"
          ]
        ],
        "note": "B stays before D and A stays before C"
      },
      {
        "inputs": [
          [
            1,
            1,
            1
          ],
          [
            "X",
            "Y",
            "Z"
          ]
        ],
        "expected": [
          [
            1,
            1,
            1
          ],
          [
            "X",
            "Y",
            "Z"
          ]
        ]
      }
    ],
    "hidden": [
      {
        "i": "daQoLo6OtE9cT9CsZCNqzBrdCP7GqZ0IOR765c0=",
        "n": 2,
        "h": "1ca7ab5b76add2d89239f4d811201677b2e5137407f9e091ae379b1af9c134ff"
      },
      {
        "i": "RRNKLeTgaw==",
        "n": 2,
        "h": "39caa72b65e98008beb1e362fd2d89004559a80638c7a1974f452aec5fece6a9"
      },
      {
        "i": "ps5CC1twOa4OKJmilBz8h3E=",
        "n": 2,
        "h": "47185b84edde5cde9a383fe2473b680b86d20798ba5ff1dd7804c9d0af5cd3c1"
      }
    ]
  },
  {
    "id": "indexed-array-mutation",
    "title": "Indexed Array Mutation",
    "module": "Module 2",
    "checkpointId": "m2-array-mutation",
    "cloIds": [
      1,
      2,
      3,
      4,
      5
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 1,
    "statement": "Apply INSERT or REMOVE to a fixed-capacity array-list representation without losing the changed value.",
    "rules": [
      [
        "Storage",
        "values includes spare physical slots; size is the logical item count."
      ],
      [
        "INSERT",
        "Allow 0..size when capacity remains, shift right from the tail, and report the inserted value."
      ],
      [
        "REMOVE",
        "Allow 0..size-1, hold the removed value, shift left, clear the old tail to 0, and report the removed value."
      ],
      [
        "Invalid",
        "Write only INVALID for an unsupported operation or index."
      ]
    ],
    "ioNote": "Read operation, values, size, index, and value. For REMOVE the final value input is ignored. Output size, physical values, and the inserted/removed value.",
    "starter": "READ operation\nREAD values\nREAD size\nREAD index\nREAD value\n# validate, shift in the safe direction, then update size",
    "salt": "fbca4cc409b4853b6c65876a712c9c63",
    "visibleTests": [
      {
        "inputs": [
          "INSERT",
          [
            10,
            15,
            20,
            30
          ],
          3,
          1,
          15
        ],
        "expected": [
          4,
          [
            10,
            15,
            20,
            30
          ],
          15
        ]
      },
      {
        "inputs": [
          "REMOVE",
          [
            10,
            30,
            0,
            0
          ],
          3,
          1,
          999
        ],
        "expected": [
          2,
          [
            10,
            30,
            0,
            0
          ],
          20
        ]
      },
      {
        "inputs": [
          "REMOVE",
          [
            10,
            0
          ],
          1,
          1,
          0
        ],
        "expected": [
          "INVALID"
        ]
      }
    ],
    "hidden": [
      {
        "i": "1ckywDrCn/2TdwWSUfE5aFx/5wWKoYiT",
        "n": 3,
        "h": "21372e8cc9632c6275e6c8e5b32c39eb6ff1abcde62bc1f7844277bba855c8bc"
      },
      {
        "i": "mYFlktK38CSGXqfuik1T+QK37hlJBOVG",
        "n": 3,
        "h": "77b25bebdf3ab1d5fe591594f7074b973bfde8fb7b0823909f3fc736a5bdfd9e"
      },
      {
        "i": "YbZeDWJBR3hMIID7Z0pQObjn+8DJYg==",
        "n": 1,
        "h": "186980fb325e73ee70d71e896ac40b7ede3aab93cd5afe2736247d01e1738312"
      },
      {
        "i": "8A7AlhrLnb4h95rK9W1WiTg5kz+fXw==",
        "n": 1,
        "h": "186980fb325e73ee70d71e896ac40b7ede3aab93cd5afe2736247d01e1738312"
      }
    ]
  },
  {
    "id": "linked-node-count",
    "title": "Count Reachable Linked Nodes",
    "module": "Module 3",
    "checkpointId": "m3-linked-foundations",
    "cloIds": [
      1,
      2,
      3,
      4,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 2,
    "statement": "Build a singly linked list from n payloads, traverse from head to NULL, and output the number of reachable nodes.",
    "rules": [
      [
        "Construction",
        "Append each allocated node exactly once."
      ],
      [
        "Traversal",
        "Advance only with current <- current.next."
      ],
      [
        "Output",
        "Write one count; an empty list has count 0."
      ]
    ],
    "ioNote": "Read n followed by n payload values.",
    "starter": "READ n\nhead <- NULL\ntail <- NULL\n# build the chain\ncount <- 0\ncurrent <- head\n# traverse to NULL\nWRITE count",
    "salt": "4db0ce49f0b9b8f565a18dc39575c749",
    "visibleTests": [
      {
        "inputs": [
          3,
          10,
          20,
          30
        ],
        "expected": [
          3
        ]
      },
      {
        "inputs": [
          0
        ],
        "expected": [
          0
        ]
      },
      {
        "inputs": [
          1,
          7
        ],
        "expected": [
          1
        ]
      }
    ],
    "hidden": [
      {
        "i": "EcEs2TZ6r1UgatSyfg==",
        "n": 1,
        "h": "0ca7e8d14733628b1086d1c5f4f184cb90d2de4a5dfb92d5c79772eb628f4c97"
      },
      {
        "i": "ym4I7zHnr3U=",
        "n": 1,
        "h": "be2217be072f468b9425275171ab8c2bba38be2ca2b18e54cf30fd235269d523"
      },
      {
        "i": "SvxF",
        "n": 1,
        "h": "ed8a8301619c32f3c85fdaf092bbddbc5459752f67fff996b014fbc7aa186d84"
      }
    ]
  },
  {
    "id": "linked-find-value",
    "title": "Lookup and Update a Node",
    "module": "Module 3",
    "checkpointId": "m3-linked-foundations",
    "cloIds": [
      1,
      2,
      3,
      4,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 2,
    "statement": "Find the first node with a target payload, update only that node, then output its position and the resulting reachable sequence.",
    "rules": [
      [
        "Match",
        "Use the first matching node."
      ],
      [
        "Missing",
        "Output -1, then the unchanged sequence."
      ],
      [
        "Identity",
        "Update current.value; do not allocate a replacement node."
      ]
    ],
    "ioNote": "Read n payloads, target, and replacement. Output the zero-based position followed by every final payload.",
    "starter": "READ n\nhead <- NULL\ntail <- NULL\n# build nodes\nREAD target\nREAD replacement\nposition <- -1\ncurrent <- head\n# find and update\nWRITE position\n# write the final chain",
    "salt": "042ce025d641494967906a2850e4ac30",
    "visibleTests": [
      {
        "inputs": [
          4,
          8,
          5,
          8,
          2,
          8,
          9
        ],
        "expected": [
          0,
          9,
          5,
          8,
          2
        ],
        "note": "only the first 8 changes"
      },
      {
        "inputs": [
          3,
          1,
          2,
          3,
          7,
          4
        ],
        "expected": [
          -1,
          1,
          2,
          3
        ]
      }
    ],
    "hidden": [
      {
        "i": "ZeOL3dBXv1vWaQuozQ==",
        "n": 4,
        "h": "67269c0cb6ac4743d880d52a10fc9ed3d64a5371af7d358a9f0c3c8d6a7dbf43"
      },
      {
        "i": "VvF0Kth9hnFz1g==",
        "n": 2,
        "h": "f4f30dbe30fe9e4f13c4fac70342c1676798e6959142d6be5f1d0b5a94439ba5"
      },
      {
        "i": "UgcgTpMztA==",
        "n": 1,
        "h": "d50f6a63661ef2deb81fdf40a149cc24d72cbb84cd62fdcbf1bcd277e46cb982"
      }
    ]
  },
  {
    "id": "linked-insert-head-problem",
    "title": "Position-Aware Linked Insertion",
    "module": "Module 3",
    "checkpointId": "m3-linked-mutation",
    "cloIds": [
      1,
      2,
      3,
      4,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 2,
    "statement": "Insert one new node at a valid zero-based position, including head and tail positions, without losing the old chain.",
    "rules": [
      [
        "Valid position",
        "Allow 0 through n; otherwise write INVALID."
      ],
      [
        "Head",
        "newNode.next receives head before head changes."
      ],
      [
        "Middle/tail",
        "Find the predecessor, connect newNode.next, then predecessor.next."
      ],
      [
        "Output",
        "Write every payload in the new reachable order."
      ]
    ],
    "ioNote": "Read n payloads, position, and new value.",
    "starter": "READ n\nhead <- NULL\ntail <- NULL\n# build nodes\nREAD position\nREAD newValue\n# validate and insert one NEW NODE\n# write the reachable chain",
    "salt": "f1ae74cff3900f0d3a17d2e36cc87921",
    "visibleTests": [
      {
        "inputs": [
          3,
          10,
          20,
          30,
          0,
          5
        ],
        "expected": [
          5,
          10,
          20,
          30
        ]
      },
      {
        "inputs": [
          3,
          10,
          20,
          30,
          2,
          25
        ],
        "expected": [
          10,
          20,
          25,
          30
        ]
      },
      {
        "inputs": [
          1,
          9,
          2,
          4
        ],
        "expected": [
          "INVALID"
        ]
      }
    ],
    "hidden": [
      {
        "i": "7P9gBBQWaQ==",
        "n": 1,
        "h": "c590068f2fa5e39711e78654139634ecb5176e013532797f03ec9d99551256d5"
      },
      {
        "i": "QKoswxWZ76TeLAw=",
        "n": 3,
        "h": "82f06c8ed801314bdaa2d4c8b35b9bde48d8f42429215474f00f630012988011"
      },
      {
        "i": "0Lt3RHqeeG6UEjFr",
        "n": 1,
        "h": "ee514efb1791e4c94ceca4cfb10c7074ba70b643505780a0d0cabd5484a75846"
      }
    ]
  },
  {
    "id": "linked-delete-first",
    "title": "Delete the First Matching Node",
    "module": "Module 3",
    "checkpointId": "m3-linked-mutation",
    "cloIds": [
      1,
      2,
      3,
      4,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 2,
    "statement": "Delete the first node whose payload equals target, safely handling head, middle, tail, singleton, empty, and missing-target cases.",
    "rules": [
      [
        "Reconnect",
        "Bypass current before clearing current.next."
      ],
      [
        "Status",
        "Write DELETED or NOT FOUND first."
      ],
      [
        "Output",
        "After the status, write every remaining reachable payload."
      ]
    ],
    "ioNote": "Read n payloads and target.",
    "starter": "READ n\nhead <- NULL\ntail <- NULL\n# build nodes\nREAD target\nprevious <- NULL\ncurrent <- head\n# locate, reconnect, and detach\n# write status and remaining chain",
    "salt": "124dd9a0f79ed01eeda98cb052181976",
    "visibleTests": [
      {
        "inputs": [
          4,
          5,
          7,
          5,
          9,
          5
        ],
        "expected": [
          "DELETED",
          7,
          5,
          9
        ]
      },
      {
        "inputs": [
          1,
          4,
          4
        ],
        "expected": [
          "DELETED"
        ]
      },
      {
        "inputs": [
          3,
          1,
          2,
          3,
          8
        ],
        "expected": [
          "NOT FOUND",
          1,
          2,
          3
        ]
      }
    ],
    "hidden": [
      {
        "i": "I6Fk9hiI8rtLo2w=",
        "n": 3,
        "h": "662591705356a8556bf457617fd4b4d7ca7f22fc4b840ddd1e4771ad004492f0"
      },
      {
        "i": "bfFbreA=",
        "n": 1,
        "h": "a22de6de43787129c5319d1bd99ed11ce6fdea648ecc2118d2e6b3bbf5568453"
      },
      {
        "i": "+ezcHM/+yWyZZY4=",
        "n": 3,
        "h": "25c17b4414ee6d2a8693c3c4fb78f24465093b1fc020d7ac1453c567fd627bad"
      }
    ]
  },
  {
    "id": "linked-relocate-sorted",
    "title": "Relocate an Updated Sorted Node",
    "module": "Module 3",
    "checkpointId": "m3-linked-mutation",
    "cloIds": [
      1,
      2,
      3,
      4,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 2,
    "statement": "Update the first target node in a sorted list, detach that same identity, and reinsert it so nondecreasing order is restored.",
    "rules": [
      [
        "Missing",
        "Write NOT FOUND and leave the list unchanged."
      ],
      [
        "Identity",
        "Do not allocate a replacement for the updated node."
      ],
      [
        "Stable gap",
        "Reinsert before the first strictly greater payload."
      ],
      [
        "Output",
        "Write UPDATED or NOT FOUND, then the final sequence."
      ]
    ],
    "ioNote": "Read n sorted payloads, target, and replacement.",
    "starter": "READ n\nhead <- NULL\ntail <- NULL\n# build the sorted chain\nREAD target\nREAD replacement\n# find, update, detach, and reinsert the same node\n# write status and final chain",
    "salt": "2575df44bd8858e8fd74148164ad8835",
    "visibleTests": [
      {
        "inputs": [
          4,
          10,
          20,
          30,
          40,
          20,
          35
        ],
        "expected": [
          "UPDATED",
          10,
          30,
          35,
          40
        ]
      },
      {
        "inputs": [
          3,
          10,
          20,
          30,
          30,
          5
        ],
        "expected": [
          "UPDATED",
          5,
          10,
          20
        ]
      },
      {
        "inputs": [
          3,
          10,
          20,
          30,
          99,
          15
        ],
        "expected": [
          "NOT FOUND",
          10,
          20,
          30
        ]
      }
    ],
    "hidden": [
      {
        "i": "TP7bn2ldqLx2",
        "n": 2,
        "h": "f7a8748509fa9db06ba85ba8519cf369b81c6924a73724267581b8f88e6eab6e"
      },
      {
        "i": "m/uPSLfEDNlEUbBq+ooN",
        "n": 5,
        "h": "b95ebbf4a2bc2a94416c46803182a222ebd127c20ef529c9b46d0633a84020a7"
      },
      {
        "i": "IdXvdR6NbQ==",
        "n": 1,
        "h": "5de058e0a314ccd8c3e03ffa25f64ccdb13a87840d1667e1de8d032487dacb2c"
      }
    ]
  },
  {
    "id": "linked-invariant-audit",
    "title": "Audit Linked-List Invariants",
    "module": "Module 3",
    "checkpointId": "m3-linked-mutation",
    "cloIds": [
      1,
      2,
      3,
      4,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 2,
    "statement": "Build a chain, optionally link the tail back to head, then report CYCLE, UNSORTED, or VALID without looping forever.",
    "rules": [
      [
        "Cycle check",
        "Use slow and fast references before attempting an unbounded traversal."
      ],
      [
        "Order check",
        "Only a cycle-free chain may be checked for nondecreasing payload order."
      ],
      [
        "Output priority",
        "CYCLE wins over UNSORTED; otherwise output VALID."
      ]
    ],
    "ioNote": "Read n payloads, then TRUE/FALSE for link-tail-to-head.",
    "starter": "READ n\nhead <- NULL\ntail <- NULL\n# build nodes\nREAD linkBack\n# optionally create the back edge\n# detect a cycle, then audit sorted order only when safe",
    "salt": "df8bce0aa1c57b923cf452a79be249a3",
    "visibleTests": [
      {
        "inputs": [
          3,
          10,
          20,
          30,
          false
        ],
        "expected": [
          "VALID"
        ]
      },
      {
        "inputs": [
          3,
          10,
          5,
          30,
          false
        ],
        "expected": [
          "UNSORTED"
        ]
      },
      {
        "inputs": [
          2,
          10,
          20,
          true
        ],
        "expected": [
          "CYCLE"
        ]
      }
    ],
    "hidden": [
      {
        "i": "Kr5zR4J1kRGs",
        "n": 1,
        "h": "42cc71975007996aca6efc12142ef142f5f7f02da72d95709c3f6661ffc92679"
      },
      {
        "i": "7zhGlPhRN3sncQ==",
        "n": 1,
        "h": "8df6798b9e84dff906c06b3017ab760a005e4127deee911cd79905c6dfc4e71c"
      },
      {
        "i": "EKfvm/VHpsKmgj3aaMIqitb13Q==",
        "n": 1,
        "h": "42cc71975007996aca6efc12142ef142f5f7f02da72d95709c3f6661ffc92679"
      },
      {
        "i": "G8zC0lDXZ708da27IK3w41g=",
        "n": 1,
        "h": "69e87aa4e888d0e1430b32037b39dede7c1a9823125aa60cd743e32076c80457"
      }
    ]
  },
  {
    "id": "stack-reverse",
    "title": "Trace LIFO Output",
    "module": "Module 4",
    "checkpointId": "m4-stack",
    "cloIds": [
      2,
      3,
      4,
      5,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 2,
    "statement": "Treat an input array as values pushed from left to right, then pop and write every value in LIFO order.",
    "rules": [
      [
        "Top",
        "The last array position is the initial top."
      ],
      [
        "Underflow",
        "Stop when top reaches 0; never read values[-1]."
      ],
      [
        "Output",
        "Write one popped value at a time."
      ]
    ],
    "ioNote": "Read one array. The empty array produces no output.",
    "starter": "READ values\ntop <- LENGTH(values)\nWHILE top > 0 DO\n    # move top, then write the popped value\nENDWHILE",
    "salt": "86eeb3c418a341c5a6ed61d6884a936f",
    "visibleTests": [
      {
        "inputs": [
          [
            1,
            2,
            3
          ]
        ],
        "expected": [
          3,
          2,
          1
        ]
      },
      {
        "inputs": [
          [
            7
          ]
        ],
        "expected": [
          7
        ]
      },
      {
        "inputs": [
          []
        ],
        "expected": []
      }
    ],
    "hidden": [
      {
        "i": "GJ3f8YURgDka",
        "n": 3,
        "h": "69750f63c47565dab04283ad3a2ae749c984ef101140e8ac1b41b4db24a9e8c4"
      },
      {
        "i": "+Ud/af19mHs=",
        "n": 2,
        "h": "1b6890f4b550760bd98c74a58fd121f16876312beafbfa4ad5290f778a84e5bd"
      },
      {
        "i": "wyMvUg==",
        "n": 0,
        "h": "f16377d4977a0611b063b32a7355b0e07c930bd090ab3b5b8b3c502c99b1b8f8"
      }
    ]
  },
  {
    "id": "balanced-delimiters",
    "title": "Validate Nested Delimiters",
    "module": "Module 4",
    "checkpointId": "m4-stack",
    "cloIds": [
      2,
      3,
      4,
      5,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 2,
    "statement": "Validate (), [], and {} tokens using a stack. Equal counts are insufficient: nesting, mismatch, underflow, and leftover openers all matter.",
    "rules": [
      [
        "Opener",
        "Push it."
      ],
      [
        "Closer",
        "The stack must be nonempty and its top must be the matching opener."
      ],
      [
        "Finish",
        "BALANCED requires no mismatch and an empty final stack."
      ],
      [
        "Unknown token",
        "Treat it as INVALID."
      ]
    ],
    "ioNote": "Read one array of one-character delimiter tokens. Output BALANCED or INVALID.",
    "starter": "READ tokens\nstack <- []\ntop <- 0\nvalid <- TRUE\n# process each token without reading an empty top\n# accept only valid AND top = 0",
    "salt": "344c5912a9ad96727a418f0fa4476efd",
    "visibleTests": [
      {
        "inputs": [
          [
            "(",
            "[",
            "{",
            "}",
            "]",
            ")"
          ]
        ],
        "expected": [
          "BALANCED"
        ]
      },
      {
        "inputs": [
          [
            "(",
            "[",
            ")",
            "]"
          ]
        ],
        "expected": [
          "INVALID"
        ],
        "note": "equal counts but incorrect nesting"
      },
      {
        "inputs": [
          [
            ")"
          ]
        ],
        "expected": [
          "INVALID"
        ],
        "note": "closer underflow"
      },
      {
        "inputs": [
          []
        ],
        "expected": [
          "BALANCED"
        ]
      }
    ],
    "hidden": [
      {
        "i": "Kyc1Ajcd15ZhZop3Dj2n",
        "n": 1,
        "h": "35df0915867693705def614120aaa34c56160eaa0355a09e092c52850714a353"
      },
      {
        "i": "JgNAxDsG4Jt6/Ds=",
        "n": 1,
        "h": "35df0915867693705def614120aaa34c56160eaa0355a09e092c52850714a353"
      },
      {
        "i": "JXAPfdE4PDbxMSXQBLvdABRhYQ==",
        "n": 1,
        "h": "0f834ca6c8e98fbb2616cb52fba6863b55836810388f3d76ce0ee19ed94c01ff"
      },
      {
        "i": "a+djPSZ7aQ==",
        "n": 1,
        "h": "35df0915867693705def614120aaa34c56160eaa0355a09e092c52850714a353"
      }
    ]
  },
  {
    "id": "postfix-operand-order",
    "title": "Preserve Postfix Operand Order",
    "module": "Module 4",
    "checkpointId": "m4-stack",
    "cloIds": [
      2,
      3,
      4,
      5,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Core",
    "contentVersion": 2,
    "statement": "Push left then right, pop right first and left second, apply one operator, and output the result.",
    "rules": [
      [
        "Operators",
        "Support +, -, *, and DIV."
      ],
      [
        "Order",
        "Compute left operator right, never right operator left."
      ],
      [
        "Invalid",
        "Write INVALID for an unsupported operator or DIV by zero."
      ]
    ],
    "ioNote": "Read left, right, and operator.",
    "starter": "READ leftInput\nREAD rightInput\nREAD operator\nstack <- []\n# push both operands\n# pop right, then left\n# validate and apply the operator",
    "salt": "831f3ac931321499bc95b32be6dc3758",
    "visibleTests": [
      {
        "inputs": [
          9,
          4,
          "-"
        ],
        "expected": [
          5
        ],
        "note": "reversing operands would produce -5"
      },
      {
        "inputs": [
          20,
          4,
          "DIV"
        ],
        "expected": [
          5
        ]
      },
      {
        "inputs": [
          7,
          0,
          "DIV"
        ],
        "expected": [
          "INVALID"
        ]
      }
    ],
    "hidden": [
      {
        "i": "N2XWrdoGJGz/",
        "n": 1,
        "h": "b25c625f4ab708160a447c4ef1243af407bd74121f2d79f8534323d1668c4812"
      },
      {
        "i": "RhsgjE2mgYOPaRQ=",
        "n": 1,
        "h": "315685abbd7efb8907aafaea4c16016c15c41e4904dcb8ce898e631e5c41e902"
      },
      {
        "i": "R0eR+kqygnhd",
        "n": 1,
        "h": "a9a00a183d996231ed73650a838fd99ad92094ac07f8ca8bc6b6045f220f2278"
      },
      {
        "i": "nJyLjXpU7NGM",
        "n": 1,
        "h": "086a013a0c396e61c358b12d4baa6b89bd38d254e1cbb5a551d62240fc432da6"
      }
    ]
  },
  {
    "id": "queue-service",
    "title": "Circular FIFO Wraparound",
    "module": "Module 4",
    "checkpointId": "m4-queue-deque",
    "cloIds": [
      2,
      3,
      4,
      5,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 2,
    "statement": "Dequeue one or more values from a full circular queue, enqueue one new value with modulo wraparound, and output logical FIFO order.",
    "rules": [
      [
        "Valid",
        "capacity must match the initial array and dequeueCount must be 1..capacity."
      ],
      [
        "Indices",
        "Advance front and back with MOD capacity."
      ],
      [
        "Output",
        "Write the last removed value, then every remaining queue value from front to back."
      ]
    ],
    "ioNote": "Read capacity, a full initial array, dequeueCount, and incoming value.",
    "starter": "READ capacity\nREAD storage\nREAD dequeueCount\nREAD incoming\n# validate, dequeue, wrap back, enqueue\n# write last removed and logical order",
    "salt": "fd69ea947bef870a8d0a3ecf4214a2b1",
    "visibleTests": [
      {
        "inputs": [
          3,
          [
            "D",
            "B",
            "C"
          ],
          1,
          "D"
        ],
        "expected": [
          "A",
          "B",
          "C",
          "D"
        ],
        "note": "back wraps from physical 2 to 0"
      },
      {
        "inputs": [
          4,
          [
            9,
            2,
            3,
            4
          ],
          3,
          9
        ],
        "expected": [
          3,
          4,
          9
        ]
      }
    ],
    "hidden": [
      {
        "i": "rbieiafFWxMxVP8=",
        "n": 2,
        "h": "c6e9a41e1b02b478b1ca3830fbdd9bb55a07479a609ee3b7b74956c32eca415c"
      },
      {
        "i": "qHzCprgXitE6Ccz3VNcY",
        "n": 3,
        "h": "2bdcda49cd0ef52b0d3d50cce6f4f1d8886eaf1efd7f9a61d079de85ba5f8a0f"
      },
      {
        "i": "TDpvfbT2WUVL4w==",
        "n": 1,
        "h": "28038ab940d5658cc5b25a58913a62785161590521dd5ab4ceba82425854fa90"
      },
      {
        "i": "qSxfrHXqUuAaSTwIvg==",
        "n": 1,
        "h": "28038ab940d5658cc5b25a58913a62785161590521dd5ab4ceba82425854fa90"
      }
    ]
  },
  {
    "id": "round-robin-reenqueue",
    "title": "Round-Robin Re-enqueueing",
    "module": "Module 4",
    "checkpointId": "m4-queue-deque",
    "cloIds": [
      2,
      3,
      4,
      5,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 2,
    "statement": "Schedule process bursts by queue order. Run at most one quantum, re-enqueue unfinished process identities, and output identities in completion order.",
    "rules": [
      [
        "Identity",
        "Processes are identified by their zero-based input positions."
      ],
      [
        "Slice",
        "Subtract MIN(quantum, remaining)."
      ],
      [
        "Re-enqueue",
        "Append only when remaining > 0."
      ],
      [
        "Invalid",
        "Write INVALID for nonpositive quantum or negative bursts."
      ]
    ],
    "ioNote": "Read a burst array and quantum. Output each completed process index.",
    "starter": "READ bursts\nREAD quantum\nready <- []\n# enqueue each process index\nhead <- 0\n# consume queue entries and append unfinished identities",
    "salt": "bfc810c5406d129ea30821510cfdb5c1",
    "visibleTests": [
      {
        "inputs": [
          [
            0,
            0
          ],
          2
        ],
        "expected": [
          1,
          0
        ],
        "note": "P1 re-enters behind P2"
      },
      {
        "inputs": [
          [
            0,
            0,
            0
          ],
          3
        ],
        "expected": [
          0,
          1,
          2
        ]
      },
      {
        "inputs": [
          [
            4
          ],
          0
        ],
        "expected": [
          "INVALID"
        ]
      }
    ],
    "hidden": [
      {
        "i": "El1fs/xk",
        "n": 0,
        "h": "7481a5bef3c50c5cb0d858515f3cb6284701c5d7ac58bce21c4c97a76be31391"
      },
      {
        "i": "dTsChhQF7M6cSEg=",
        "n": 3,
        "h": "b32ea97921bf8f021944c7e2de07f1252e7b75d761aec0bb7c9fb06c7b223a79"
      },
      {
        "i": "5JuPWNW1I7KL",
        "n": 2,
        "h": "0e175b630493e1a60dbbf529826ecb7b990a8357531bfa067ff341a71f6c240b"
      },
      {
        "i": "vbUnL0wKT/G+Xg==",
        "n": 1,
        "h": "aa7724c12b8cd6ef01c752aa281cd2cde9ef9d31dbe449905f55caa64a609568"
      }
    ]
  },
  {
    "id": "deque-priority",
    "title": "Execute Deque End Operations",
    "module": "Module 4",
    "checkpointId": "m4-queue-deque",
    "cloIds": [
      2,
      3,
      4,
      5,
      6
    ],
    "reviewStatus": "reviewed",
    "difficulty": "Challenge",
    "contentVersion": 2,
    "statement": "Execute operation codes against a fixed-capacity circular deque and distinguish both insertion ends and both removal ends.",
    "rules": [
      [
        "Codes",
        "1 ADD_FRONT, 2 ADD_BACK, 3 REMOVE_FRONT, 4 REMOVE_BACK."
      ],
      [
        "Values",
        "A parallel value is used only by add operations."
      ],
      [
        "Safety",
        "Any add on full, remove on empty, or unknown code outputs INVALID and stops."
      ],
      [
        "Output",
        "Write each removed value, then STATE, then remaining values from front to back."
      ]
    ],
    "ioNote": "Read capacity, operation-code array, and parallel values array.",
    "starter": "READ capacity\nREAD operations\nREAD values\n# create capacity slots and maintain front + size\n# execute only legal end operations\n# output removals, STATE, then remaining order",
    "salt": "bfd2d0cd60ab934da9ddb2ef8ed10825",
    "visibleTests": [
      {
        "inputs": [
          4,
          [
            2,
            2,
            1,
            4,
            3
          ],
          [
            10,
            20,
            5,
            0,
            0
          ]
        ],
        "expected": [
          20,
          5,
          "STATE",
          10
        ]
      },
      {
        "inputs": [
          2,
          [
            3
          ],
          [
            0
          ]
        ],
        "expected": [
          "INVALID"
        ],
        "note": "remove-front underflow"
      },
      {
        "inputs": [
          3,
          [
            1,
            2
          ],
          [
            7,
            8
          ]
        ],
        "expected": [
          "STATE",
          7,
          8
        ]
      }
    ],
    "hidden": [
      {
        "i": "iIZVY6bQ5rOcnqdR8wZ9dXc3cA==",
        "n": 3,
        "h": "e293fa6ee99a9def312d4256f13f79c6170100a821267e8bab325036f5fa5381"
      },
      {
        "i": "xPI77lkhTsd94kYDo6zVdIz9NA==",
        "n": 3,
        "h": "e293fa6ee99a9def312d4256f13f79c6170100a821267e8bab325036f5fa5381"
      },
      {
        "i": "qWw74cuJ7nf6irI8luYp",
        "n": 1,
        "h": "443a4f62242afd30ee2ec176f116ec2e9587b97ee71d1bace45b2773c448aea3"
      },
      {
        "i": "afWXz09h61W0xdA=",
        "n": 1,
        "h": "443a4f62242afd30ee2ec176f116ec2e9587b97ee71d1bace45b2773c448aea3"
      }
    ]
  }
];
