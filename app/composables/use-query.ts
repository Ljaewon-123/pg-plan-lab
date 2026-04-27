export const useQuery = () => {
  const source = useState(() => '')
  const query = useState(() => '')
  return {
    source,
    query,
  }
}
