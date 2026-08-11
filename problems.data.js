/*
 * GENERATED FILE — do not edit by hand.
 * Built from problems.public.json + problems.hidden.json by tools/build-problems.js
 *
 * Expected answers for hidden cases are stored only as salted, iterated
 * SHA-256 digests (4000 rounds). They are one-way: there is no key here
 * and nothing to decrypt. Hidden inputs are obfuscated, not encrypted.
 */
const PROBLEM_ROUNDS = 4000;
const PROBLEMS = [
  {
    "id": "sum-two",
    "title": "Sum of Two Numbers",
    "module": "Module 1",
    "difficulty": "Warm-up",
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
        "note": "the example from the lecture"
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
    "difficulty": "Core",
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
    "difficulty": "Core",
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
    "difficulty": "Core",
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
        "note": "the example from the lecture"
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
    "difficulty": "Core",
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
    "difficulty": "Challenge",
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
        "note": "the traced example from the lecture"
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
    "difficulty": "Warm-up",
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
    "difficulty": "Core",
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
    "difficulty": "Core",
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
    "difficulty": "Challenge",
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
    "difficulty": "Challenge",
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
    "difficulty": "Challenge",
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
  }
];
