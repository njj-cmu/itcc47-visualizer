# Valid input: a nonnegative integer n. Each call returns 1 + ... + n.
def sum_to(n):
    if n == 0:
        return 0
    child_total = sum_to(n - 1)
    total = n + child_total
    return total


if __name__ == "__main__":
    answer = sum_to(3)
    print(answer)
