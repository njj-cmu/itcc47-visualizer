def partition(values, low, high):
    pivot = values[high]
    i = low - 1

    for j in range(low, high):
        if values[j] <= pivot:
            i += 1
            values[i], values[j] = values[j], values[i]

    values[i + 1], values[high] = values[high], values[i + 1]
    return i + 1


def quick_sort(values, low, high):
    if low < high:
        pivot_index = partition(values, low, high)
        quick_sort(values, low, pivot_index - 1)
        quick_sort(values, pivot_index + 1, high)


if __name__ == "__main__":
    values = [8, 3, 1, 7, 0, 10, 2, 5]
    quick_sort(values, 0, len(values) - 1)
    print(values)
