import { Screen, Section } from "@/src/shared/ui";
import { SearchInput } from "../components/SearchInput";

export function SearchScreen() {
	return (
		<Screen>
			<Section>
				<SearchInput />
			</Section>
		</Screen>
	);
}