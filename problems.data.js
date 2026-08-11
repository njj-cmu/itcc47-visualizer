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
        "h": "a2ad2511a3bbe0c78c4e8f9aa587c1cb3fc68abb22ef297571117894b1e6df42"
      },
      {
        "i": "y+mJi+AKxpCUUgI=",
        "n": 3,
        "h": "eeb3f0e402a15d929363c29a63b1695ae8c557e2d209c04b690a09d77b6e52c9"
      },
      {
        "i": "Uxu1DMuSBuhbOpk6pZC2W8FgWP8908xjK3I=",
        "n": 3,
        "h": "45ac20ee30498e455073cd5ef6aa50d2e2300d8c43db2d3c06837cf0159df547"
      },
      {
        "i": "qi37O9ONNLtT5ftf",
        "n": 3,
        "h": "b0ea633572e0f129935c0e3d43408e82ec1f0bdcdf1a7e6a297244109f52c4fc"
      },
      {
        "i": "7vY77W8MojgsUI44s5nfbg==",
        "n": 3,
        "h": "4619895db0a349a1a8707afa87dc086f64889f6ce0016f38ab42b2923e2a7653"
      }
    ]
  }
];
