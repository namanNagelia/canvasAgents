from langchain.agents import create_react_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langchain.chat_models import init_chat_model
from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage
from langchain_tavily import TavilySearch
from utilities import process_file
from langchain_core.prompts import MessagesPlaceholder
import os
from dotenv import load_dotenv

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["TAVILY_API_KEY"] = TAVILY_API_KEY
if not TAVILY_API_KEY or not OPENAI_API_KEY:
    raise ValueError("Missing TAVILY_API_KEY or OPENAI_API_KEY in .env")

# Function to process files


# Set up search tool
tool = TavilySearch(
    max_results=5,
    include_images=True,
    search_depth="advanced",
)

llm = init_chat_model("gpt-4o-mini", api_key=OPENAI_API_KEY,
                      temperature=.7, max_tokens=7500)

tools = [tool]


def create_note_taking_agent():
    system_prompt = """You are an expert note-taking assistant that creates clear, concise, and well-structured notes.

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create comprehensive, well-organized notes with clear headings and subheadings. Add all formulas, relevant information, caveats and devices to help you remember each topic in detail.
3. Include relevant examples or analogies when helpful
4. Add diagrams or formulas when applicable
5. Focus on accuracy and educational value
6. Format using markdown for readability, for equations use latex

When returning your notes, use the following structure:
- First explain your thought process
- Mention what research method you used
- Then provide the complete formatted notes
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])

    agent = create_react_agent(llm, tools, prompt=prompt)

    return agent


def create_research_agent():
    system_prompt = """You are an expert research-based note-taking assistant that creates comprehensive notes with proper citations.

INSTRUCTIONS:
1. Research the topic thoroughly using web search for up-to-date information
2. Include proper citations for all external information
3. Create comprehensive, well-organized notes with clear headings and subheadings, and add all formulas, relevant information, caveats etc
4. Focus on accuracy and scholarly value
5. Format using markdown for readability, including proper citation format
6. For scientific topics, include recent research findings when applicable

When returning your notes, use the following structure:
- First explain your research methodology
- Then provide the complete formatted notes with citations
- End with a bibliography or reference section
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])

    agent = create_react_agent(llm, tools, prompt=prompt)

    return agent


def create_step_agent():
    system_prompt = """You are an expert step-by-step problem-solving assistant that breaks down complex problems.

INSTRUCTIONS:
1. Break down problems into clear, logical steps on how to solve them
2. For math/physics/technical problems, show all work and calculations
3. Explain the reasoning behind each step
4. Use web search when necessary to verify formulas or approaches
5. For equations use latex formatting
6. Include examples to illustrate concepts when helpful

When returning your solution, use the following structure:
- First identify the type of problem and key concepts involved
- Then present the step-by-step solution with clear explanations
- Include diagrams or visual aids when applicable
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])

    # Create the agent
    agent = create_react_agent(llm, tools, prompt=prompt)

    return agent

# Create diagram-generating agent


def create_diagram_agent():
    system_prompt = """You are an expert diagram-generating assistant that creates clear, informative diagrams.

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create appropriate diagrams that best represent the concept
3. Use Mermaid syntax for flowcharts, sequence diagrams, class diagrams, etc.
4. Focus on clarity and educational value
5. Explain the key components of your diagram
6. Always verify that your Mermaid syntax is valid

When returning your diagram, use the following structure:
- First explain your thought process for creating this diagram
- Then provide the complete Mermaid code
- Include a brief explanation of how to interpret the diagram
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])

    # Create the agent
    agent = create_react_agent(llm, tools, prompt=prompt)

    return agent

# Create flashcard-generating agent


def create_flashcard_agent():
    system_prompt = """You are an expert flashcard-generating assistant that creates effective study materials.

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create comprehensive yet concise question-answer pairs
3. Cover all important aspects of the topic
4. Ensure questions are specific and clear
5. Organize flashcards by subtopic when applicable
6. Include a mix of definitional, conceptual, and application questions

When returning your flashcards, use the following structure:
- First explain your approach to creating these flashcards
- Then provide the complete set of flashcards in an organized format
- Include suggestions for effective study techniques using these flashcards
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])

    # Create the agent
    agent = create_react_agent(llm, tools, prompt=prompt)

    return agent

# Create Feynman technique explanation agent


def create_feynman_agent():
    system_prompt = """You are an expert Feynman technique assistant that simplifies complex concepts.

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Explain the concept as if teaching it to someone with no background in the subject
3. Use simple language and avoid jargon
4. Incorporate relatable analogies and concrete examples
5. Break down complex ideas into their simplest components
6. Identify and address common misconceptions

When returning your explanation, use the following structure:
- First identify the core concept to be explained
- Then provide the simplified explanation using the Feynman technique
- Include analogies, examples, and visual descriptions
- End with a brief summary of the key takeaways
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])

    # Create the agent
    agent = create_react_agent(llm, tools, prompt=prompt)

    return agent


note_agent = create_note_taking_agent()
research_agent = create_research_agent()
step_agent = create_step_agent()
diagram_agent = create_diagram_agent()
flashcard_agent = create_flashcard_agent()
feynman_agent = create_feynman_agent()


def run_research_agent(query, context="", files=[]):
    return research_agent.invoke({"messages": [("user", query)]})


def run_step_agent(query, context="", files=[]):
    return step_agent.invoke({"messages": [("user", query)]})


def run_diagram_agent(query, context="", files=[]):
    return diagram_agent.invoke({"messages": [("user", query)]})


def run_flashcard_agent(query, context="", files=[]):
    return flashcard_agent.invoke({"messages": [("user", query)]})


def run_feynman_agent(query, context="", files=[]):
    return feynman_agent.invoke({"messages": [("user", query)]})


def run_agent(topic_request, file_paths=None, agent=note_agent):
    """
    Run the note-taking agent with the given topic and optional files.

    Args:
        topic_request (str): The topic to take notes on
        file_paths (list): Optional list of file paths to process
    """
    # Process files if provided
    file_content = ""
    if file_paths:
        for path in file_paths:
            content = process_file(path)
            file_content += f"\nContent from {path}:\n{content}\n"

    # Create the message with file content if available
    if file_content:
        message_content = f"Please take notes about {topic_request}. Use the following file content as reference:\n\n{file_content}"
    else:
        message_content = f"Please take notes about {topic_request}"

    # Run the agent with the constructed message
    for step in agent.stream(
        {
            "messages": [HumanMessage(content=message_content)]
        },
        stream_mode="values",
    ):
        if "messages" in step and step["messages"]:
            print(step["messages"][-1].content)


run_agent(
    "Markov Decision Processes (MDPs) in AI with examples and practical applications",
    file_paths=["/Users/nnagelia/Downloads/14_MDPs_RL.pdf"],
    agent=diagram_agent
)
