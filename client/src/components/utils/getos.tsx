import { useFavicon } from "react-haiku"

export const Component = () => {
    const { setFavicon } = useFavicon();

    return <button onClick={() => setFavicon('https://bit.ly/3NEz8Sj')}>Update Favicon</button>
}