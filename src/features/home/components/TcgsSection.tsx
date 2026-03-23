import { useRouter } from 'expo-router';
import type { HomeTcgSummary } from "../home.types";
import { TcgSummaryCard } from "@/src/features/tcgs/components/TcgSummaryCard";
import { Grid } from "@/src/shared/ui";

type Props = {
    tcgs: HomeTcgSummary[];
};

export function TcgsSection({ tcgs }: Props) {
    const router = useRouter();

    return (
        <Grid columns={1}>
            {tcgs.map((tcg) => (
                <TcgSummaryCard
                    key={tcg.id}
                    title={tcg.title}
                    totalOwned={tcg.totalOwned}
                    logoImage={tcg.logoImage}
                    onPress={() => router.push(`/card-list?tcg=${tcg.id}`)}
                />
            ))}
        </Grid>
    );
}