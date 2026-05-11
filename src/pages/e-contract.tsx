import React from "react";
import { Page } from "zmp-ui";
import { EContractFlow } from "@/components/e-contract/EContractFlow";

const EContractPage: React.FC = () => {
    return (
        <Page className="e-contract-page page" hideScrollbar>
            <EContractFlow />
        </Page>
    );
};

export default EContractPage;
