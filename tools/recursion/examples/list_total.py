# Valid input: a finite list of small integers; 0 <= index <= len(values).
# The list is shared and read-only. Each function call owns its own index.
def list_total(values, index=0):
    if index == len(values):
        return 0
    child_total = list_total(values, index + 1)
    total = values[index] + child_total
    return total


if __name__ == "__main__":
    values = [4, 2, 7, 1]
    answer = list_total(values, 0)
    print(answer)
