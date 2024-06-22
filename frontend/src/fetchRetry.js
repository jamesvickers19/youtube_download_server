function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

export function fetchRetry(url, fetchOptions = {}, delayMs = 500, tries = 5) {
    function onError(err) {
        console.log("Fetch error", err);
        const triesLeft = tries - 1;
        if (!triesLeft) {
            throw err;
        }
        return wait(delayMs).then(() => fetchRetry(url, fetchOptions, delayMs, triesLeft));
    }
    return fetch(url, fetchOptions)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Response status code ${response.status}`)
            }
            return response;
        })
        .catch(onError);
}
