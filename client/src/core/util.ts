export const intersect = <T>(A: T[], B: T[], comparisonFn: (a: T, b: T) => boolean = (a, b) => a === b, pick: "a" | "b" = "b") => {
    const result: T[] = [];
    for (const a of A) {
        const x = B.find((b) => comparisonFn(a, b));
        if (x) {
            if (pick === "a") {
                result.push(a);
            } else {
                result.push(x);
            }
        }
    }
    return result;
}

/** Returns both elements as a tuple pair for each intersecting element */
export const crossIntersect = <T>(A: T[], B: T[], comparisonFn: (a: T, b: T) => boolean = (a, b) => a === b) => {
    const result: [a: T, b: T][] = [];
    for (const a of A) {
        const x = B.find((b) => comparisonFn(a, b));
        if (x) {
            result.push([a, x]);
        }
    }
    return result;
}

export const unique = <T>(arr: T[]) => {
    return [...new Set(arr)];
}