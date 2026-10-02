# Valid input: a nonnegative integer n. Use small values for tracing.
def countdown(n):
    if n == 0:
        return
    print("enter", n)
    countdown(n - 1)
    print("leave", n)


if __name__ == "__main__":
    countdown(3)
