/* eslint-disable @typescript-eslint/no-unused-vars */

import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import {
    Typesense,
    TypesenseConfig
} from "@langchain/community/vectorstores/typesense";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CompiledStateGraph, END, MemorySaver, START, StateDefinition, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import * as hub from "langchain/hub";
import { typesense } from ".";
import { config } from "./config";
import { ANSWER_GRADER_TEMPLATE, GRADER_TEMPLATE } from "./utils/const";

export interface GraphInterface {
    question: string;
    generatedAnswer: string;
    documents: Document[];
    model: ChatOpenAI;
    jsonResponseModel: ChatOpenAI;
}

class RAGSystemTypeSense {
    private vectorStore: Typesense | null = null;
    private graph: StateGraph<GraphInterface> | null = null;
    private ragApp: CompiledStateGraph<GraphInterface, Partial<GraphInterface>, "__start__", StateDefinition, StateDefinition, StateDefinition> | null = null;
    private typesenseVectorStoreConfig: TypesenseConfig;

    constructor() {
        this.typesenseVectorStoreConfig = {
            typesenseClient: typesense,
            schemaName: "course",
            // Start of Selection
            columnNames: {
                vector: "vec",
                pageContent: "text",
                metadataColumnNames: ["title", "subtitle", "description", "startDate", "timing", "slug"],
            },
            import: async (data: any, collectionName: string) => {
                await typesense
                    .collections(collectionName)
                    .documents()
                    .import(data, { action: "emplace", dirty_values: "drop" });
            },
        } satisfies TypesenseConfig;

        this.initializeGraph();
    }

    private initializeGraph() {
        const graphState = {
            question: null,
            generatedAnswer: null,
            documents: {
                value: (x: Document[], y: Document[]) => y,
                default: () => [],
            },
            model: null,
            jsonResponseModel: null
        };

        this.graph = new StateGraph<GraphInterface>({ channels: graphState })
            .addNode("retrieve_docs", this.retrieveDocs.bind(this))
            .addNode("create_model", this.createModel.bind(this))
            .addNode("create_json_response_model", this.createJsonResponseModel.bind(this))
            .addNode("grade_documents", this.gradeDocuments.bind(this))
            .addNode("generate_answer", this.generateAnswer.bind(this))
            .addNode("grade_answer", this.gradeAnswer.bind(this))
            .addEdge(START, "retrieve_docs")
            .addEdge("retrieve_docs", "create_model")
            .addEdge("create_model", "create_json_response_model")
            .addEdge("create_json_response_model", "grade_documents")
            .addConditionalEdges("grade_documents", this.hasRelevantDocs.bind(this), {
                yes: "generate_answer",
                no: END
            })
            .addEdge("generate_answer", "grade_answer")
            .addEdge("grade_answer", END) as StateGraph<GraphInterface>;

        this.ragApp = this.graph.compile({
            checkpointer: new MemorySaver()
        });
    }

    private async createModel(state: GraphInterface) {
        return {
            model: new ChatOpenAI({
                model: "gpt-4o-mini",
                temperature: 0,
                apiKey: config.OPENAI_API_KEY,
            }),
        };
    }

    private async createJsonResponseModel(state: GraphInterface) {
        const jsonResponseModel = new ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0,
            apiKey: config.OPENAI_API_KEY,
        });

        return {
            jsonResponseModel: jsonResponseModel.bind({
                response_format: { type: "json_object" }
            })
        };
    }

    private async buildTypeSenseVectorStore() {
        console.log("inside buildTypeSenseVectorStore");
        if (this.vectorStore) {
            return this.vectorStore;
        }

        const embeddings = new HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2",
        });

        this.vectorStore = new Typesense(embeddings, this.typesenseVectorStoreConfig);
        return this.vectorStore;
    }

    private async retrieveDocs(state: GraphInterface) {
        console.log("inside retrieveDocs");

        const vectorStore = await this.buildTypeSenseVectorStore();

        const embeddings = new HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2",
        });
        console.log("question", state.question);
        const retrievedDocs = await vectorStore.asRetriever().invoke(state.question);
        console.log({ retrievedDocs })
        return { documents: retrievedDocs };
    }

    private async gradeDocuments(state: GraphInterface) {
        const docs = state.documents;
        const gradingPrompt = ChatPromptTemplate.fromTemplate(GRADER_TEMPLATE);
        const docsGrader = gradingPrompt.pipe(state.jsonResponseModel);

        const gradingPromises = docs.map(async (doc) => {
            const gradedResponse = await docsGrader.invoke({
                document: doc.pageContent,
                question: state.question
            });

            const parsedResponse = JSON.parse(gradedResponse.content as string);
            return parsedResponse.relevant ? doc : null;
        });

        const gradedDocs = await Promise.all(gradingPromises);

        return { documents: gradedDocs.filter(Boolean) };
    }

    private hasRelevantDocs(state: GraphInterface) {
        const relevant = state.documents.length > 0;
        return relevant ? "yes" : "no";
    }

    private async generateAnswer(state: GraphInterface) {
        const ragPrompt = await hub.pull("rlm/rag-prompt");
        const ragChain = ragPrompt.pipe(state.model).pipe(new StringOutputParser());

        const generatedAnswer = await ragChain.invoke({
            context: state.documents,
            question: state.question
        });

        return { generatedAnswer };
    }

    private async gradeAnswer(state: GraphInterface) {
        const answerGraderPrompt = ChatPromptTemplate.fromTemplate(ANSWER_GRADER_TEMPLATE);
        const answerGrader = answerGraderPrompt.pipe(state.jsonResponseModel);

        const gradedResponse = await answerGrader.invoke({
            question: state.question,
            answer: state.generatedAnswer
        });

        const parsedResponse = JSON.parse(gradedResponse.content as string);

        if (parsedResponse.relevant) {
            return { generatedAnswer: state.generatedAnswer };
        }

        return { generatedAnswer: "Sorry, I am unable to help you with this question." };
    }

    public async invokeRAG(question: string) {
        if (!this.ragApp) {
            throw new Error("RAG app is not initialized");
        }
        const graphResponse: GraphInterface = await this.ragApp.invoke(
            { question },
            { configurable: { thread_id: crypto.randomUUID() } }
        );

        return graphResponse;
    }
}

export const ragSystemTypeSense = new RAGSystemTypeSense(); 
