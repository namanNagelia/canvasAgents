from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langchain.chat_models import init_chat_model
from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, FunctionMessage
from langchain_tavily import TavilySearch
from utilities import process_file
import json
from typing import List, Dict, Any, Optional
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain_core.agents import AgentActionMessageLog, AgentFinish
import os
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, MessagesState, StateGraph

from dotenv import load_dotenv
from functools import partial

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["TAVILY_API_KEY"] = TAVILY_API_KEY
if not TAVILY_API_KEY or not OPENAI_API_KEY:
    raise ValueError("Missing TAVILY_API_KEY or OPENAI_API_KEY in .env")

tool = TavilySearch(
    max_results=5,
    include_images=True,
    search_depth="advanced",
)

llm = init_chat_model("gpt-4o", api_key=OPENAI_API_KEY,
                      temperature=.7, max_tokens=7500)

tools = [tool]

cot_planning_template = """
Before answering, I will take these planning steps:

1. STEP PLANNING:
   - Break down this task into clear, logical steps
   - For each step, determine what information or analysis is needed
   - Identify which tools might be useful at each step

2. INFORMATION GATHERING:
   - Determine what information I already know about this topic
   - Identify knowledge gaps that require research
   - Plan specific searches to fill those knowledge gaps

3. ANALYSIS & ORGANIZATION:
   - Plan how to structure the information for maximum clarity
   - Determine the best format for presenting this information
   - Consider how to connect concepts logically

4. OUTPUT PREPARATION:
   - Plan the format and structure of my final response
   - Ensure all requirements from the instructions are addressed
   - Consider how to make the output most useful for the user
"""


class GeneralResponse(BaseModel):
    """Final structured general output"""
    planning_process: str = Field(
        description="Detailed explanation of the planning process")
    answer: str = Field(description="Answer to the user's query")


class NoteResponse(BaseModel):
    """Final structured notes output"""
    planning_process: str = Field(
        description="Detailed explanation of the planning process")
    research_method: str = Field(description="Method used for research")
    formatted_notes: str = Field(
        description="Complete formatted notes using markdown")


class ResearchResponse(BaseModel):
    """Final structured research notes output"""
    planning_process: str = Field(
        description="Detailed explanation of the planning and research methodology")
    formatted_notes: str = Field(
        description="Complete formatted notes with citations")
    bibliography: str = Field(description="Bibliography or reference section")


class StepResponse(BaseModel):
    """Final structured problem-solving output"""
    planning_process: str = Field(
        description="Problem-solving plan and approach")
    problem_identification: str = Field(
        description="Type of problem and key concepts involved")
    step_solution: str = Field(
        description="Step-by-step solution with clear explanations")
    visual_aids: Optional[str] = Field(
        description="Diagrams or visual aids when applicable", default=None)


class DiagramResponse(BaseModel):
    """Final structured diagram output"""
    planning_process: str = Field(
        description="Detailed diagram planning process")
    diagram_type_rationale: str = Field(
        description="Explanation of why this diagram type was chosen")
    diagram_code: str = Field(description="Complete Mermaid code")
    interpretation: str = Field(
        description="Brief explanation of how to interpret the diagram")


class FlashcardResponse(BaseModel):
    """Final structured flashcard output"""
    planning_process: str = Field(
        description="Planning approach to creating these flashcards")
    organization_approach: str = Field(
        description="How the content is organized and why")
    flashcards: str = Field(
        description="Complete set of flashcards in an organized format")
    study_tips: str = Field(
        description="Suggestions for effective study techniques")


class FeynmanResponse(BaseModel):
    """Final structured Feynman explanation output"""
    planning_process: str = Field(
        description="Planning process for simplifying this concept")
    core_concept: str = Field(description="Core concept to be explained")
    explanation: str = Field(
        description="Simplified explanation using the Feynman technique")
    examples: str = Field(
        description="Analogies, examples, and visual descriptions")
    summary: str = Field(description="Brief summary of the key takeaways")


def parse_output(output, response_class):
    if "function_call" not in output.additional_kwargs:
        return AgentFinish(return_values={"output": output.content}, log=output.content)

    function_call = output.additional_kwargs["function_call"]
    name = function_call["name"]
    inputs = json.loads(function_call["arguments"])

    if name == response_class.__name__:
        return AgentFinish(return_values=inputs, log=str(function_call))
    else:
        return AgentActionMessageLog(
            tool=name, tool_input=inputs, log="", message_log=[output]
        )


def parse_note_output(output):
    return parse_output(output, NoteResponse)


def parse_research_output(output):
    return parse_output(output, ResearchResponse)


def parse_step_output(output):
    return parse_output(output, StepResponse)


def parse_diagram_output(output):
    return parse_output(output, DiagramResponse)


def parse_flashcard_output(output):
    return parse_output(output, FlashcardResponse)


def parse_feynman_output(output):
    return parse_output(output, FeynmanResponse)


def parse_general_output(output):
    return parse_output(output, GeneralResponse)


def create_note_taking_agent():
    system_prompt = f"""You are an expert note-taking assistant that creates clear, concise, and well-structured notes.


{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create comprehensive, well-organized notes with clear headings and subheadings. Add all formulas, relevant information, caveats and devices to help you remember each topic in detail.
3. Include relevant examples or analogies when helpful
4. Add diagrams or formulas when applicable
5. Focus on accuracy and educational value
6. Format using markdown for readability, for equations use latex

When returning your notes, use the structured output format with these fields:
- planning_process: Detailed explanation of your planning process
- research_method: Method used for research
- formatted_notes: Complete formatted notes using markdown
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, GeneralResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_general_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_research_agent():
    system_prompt = f"""You are an expert research-based note-taking assistant that creates comprehensive notes with proper citations.

{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using web search for up-to-date information
2. Include proper citations for all external information
3. Create comprehensive, well-organized notes with clear headings and subheadings, and add all formulas, relevant information, caveats etc
4. Focus on accuracy and scholarly value
5. Format using markdown for readability, including proper citation format
6. For scientific topics, include recent research findings when applicable

When returning your notes, use the structured output format with these fields:
- planning_process: Detailed explanation of your planning and research methodology
- formatted_notes: Complete formatted notes with citations
- bibliography: Bibliography or reference section
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, ResearchResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_research_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_step_agent():
    system_prompt = f"""You are an expert step-by-step problem-solving assistant that breaks down complex problems.

{cot_planning_template}

INSTRUCTIONS:
1. Break down problems into clear, logical steps on how to solve them
2. For math/physics/technical problems, show all work and calculations
3. Explain the reasoning behind each step
4. Use web search when necessary to verify formulas or approaches
5. For equations use latex formatting
6. Include examples to illustrate concepts when helpful

When returning your solution, use the structured output format with these fields:
- planning_process: Detailed explanation of your problem-solving plan and approach
- problem_identification: Type of problem and key concepts involved
- step_solution: Step-by-step solution with clear explanations
- visual_aids: Diagrams or visual aids when applicable (optional)
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, StepResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_step_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_diagram_agent():
    system_prompt = f"""You are an expert diagram-generating assistant that creates clear, informative diagrams.

{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create appropriate diagrams that best represent the concept
3. Use Mermaid syntax for flowcharts, sequence diagrams, class diagrams, etc.
4. Focus on clarity and educational value
5. Explain the key components of your diagram
6. Always verify that your Mermaid syntax is valid

When returning your diagram, use the structured output format with these fields:
- planning_process: Detailed explanation of your diagram planning process
- diagram_type_rationale: Description of why you chose this particular diagram type
- diagram_code: Complete Mermaid code
- interpretation: Brief explanation of how to interpret the diagram
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, DiagramResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_diagram_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_flashcard_agent():
    system_prompt = f"""You are an expert flashcard-generating assistant that creates effective study materials.

{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create comprehensive yet concise question-answer pairs
3. Cover all important aspects of the topic
4. Ensure questions are specific and clear
5. Organize flashcards by subtopic when applicable
6. Include a mix of definitional, conceptual, and application questions

When returning your flashcards, use the structured output format with these fields:
- planning_process: Detailed explanation of your planning approach
- organization_approach: Description of how you've organized the content and why
- flashcards: Complete set of flashcards in an organized format
- study_tips: Suggestions for effective study techniques
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, FlashcardResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_flashcard_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_feynman_agent():
    system_prompt = f"""You are an expert Feynman technique assistant that simplifies complex concepts.

{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Explain the concept as if teaching it to someone with no background in the subject
3. Use simple language and avoid jargon
4. Incorporate relatable analogies and concrete examples
5. Break down complex ideas into their simplest components
6. Identify and address common misconceptions

When returning your explanation, use the structured output format with these fields:
- planning_process: Detailed explanation of your planning process
- core_concept: Core concept to be explained
- explanation: Simplified explanation using the Feynman technique
- examples: Analogies, examples, and visual descriptions
- summary: Brief summary of the key takeaways
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, FeynmanResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_feynman_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_general_agent():
    system_prompt = f"""You are an expert assistant that answers the User's query in detail, and can search the web if needed
    {cot_planning_template}
    
    INSTRUCTIONS:
    1. Answer the User's query in detail
    2. If needed search the web for the answer
    3. When the user asks a follow-up question, remember to consider our previous conversation
    """

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_tools([tool, GeneralResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_general_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


general_agent = create_general_agent()
note_agent = create_note_taking_agent()
research_agent = create_research_agent()
step_agent = create_step_agent()
diagram_agent = create_diagram_agent()
flashcard_agent = create_flashcard_agent()
feynman_agent = create_feynman_agent()


def run_agent(topic_request, file_paths=None, agent_type="note", session_id=None, chat_history=None):
    """
    Run the specified agent with the given topic and optional files, maintaining conversation history.

    Args:
        topic_request (str): The topic to process
        file_paths (list): Optional list of file paths to process
        agent_type (str): Type of agent to use 
        session_id (str): Optional session ID for persistence
        chat_history (list): Optional list of previous messages

    Returns:
        dict: Structured output from the agent
    """
    agent_map = {
        "note": note_agent,
        "research": research_agent,
        "step": step_agent,
        "diagram": diagram_agent,
        "flashcard": flashcard_agent,
        "feynman": feynman_agent,
        "general": general_agent
    }

    selected_agent = agent_map.get(agent_type)
    if not selected_agent:
        raise ValueError(f"Unknown agent type: {agent_type}")

    if chat_history is None:
        chat_history = []

    # Process files if provided
    file_content = ""
    if file_paths:
        for path in file_paths:
            content = process_file(path)
            file_content += f"\nContent from {path}:\n{content}\n"

    if file_content:
        message_content = f"Please process this topic: {topic_request}. Use the following file content as reference:\n\n{file_content}"
    else:
        message_content = f"Please process this topic: {topic_request}"

    # Create a new message for the current request
    new_message = HumanMessage(content=message_content)

    # Combine history with the new message
    messages = chat_history + [new_message]

    # Invoke the agent with the combined messages
    result = selected_agent.invoke(
        {
            "messages": messages
        }
    )

    # Update chat history with the new exchange
    chat_history.append(new_message)

    # Add the AI's response to the chat history (for next time)
    if isinstance(result, dict) and "output" in result:
        ai_response = AIMessage(content=str(result))
        chat_history.append(ai_response)

    # Return both the result and updated history
    return result, chat_history


def display_result(result, agent_type="note"):
    """
    Format and display the result based on agent type.

    Args:
        result (dict): The result from the agent
        agent_type (str): Type of agent used
    """
    print("\n" + "="*50)
    print(f"FINAL {agent_type.upper()} OUTPUT")
    print("="*50)

    if agent_type == "diagram":
        print("\nPLANNING PROCESS:")
        print(result["planning_process"])

        print("\nDIAGRAM TYPE RATIONALE:")
        print(result["diagram_type_rationale"])

        print("\nDIAGRAM CODE:")
        print("```mermaid")
        print(result["diagram_code"])
        print("```")

        print("\nINTERPRETATION:")
        print(result["interpretation"])
    else:
        # Display other agent types
        for key, value in result.items():
            print(f"\n{key.upper().replace('_', ' ')}:")
            print(value)

    print("\n" + "="*50)


# Update the test function to demonstrate conversation memory
if __name__ == "__main__":
    # Start with empty chat history
    chat_history = []

    # First question
    topic = "Explain to me how pytorch and ML Works "
    result, chat_history = run_agent(
        topic,
        file_paths=None,
        agent_type="general",
        chat_history=chat_history
    )
    display_result(result, agent_type="general")

    # # Follow-up question (should reference the prior conversation)
    # topic = "Explain to me the practical applications of what i just asked you"
    # result, chat_history = run_agent(
    #     topic,
    #     file_paths=None,
    #     agent_type="general",
    #     chat_history=chat_history
    # )
    # display_result(result, agent_type="general")

    # topic = "Now give me a step by step tutorial on how to use it"
    # result, chat_history = run_agent(
    #     topic,
    #     file_paths=None,
    #     agent_type="step",
    #     chat_history=chat_history
    # )
    # display_result(result, agent_type="step")

    # topic = "Finally, show me a diagram of the concept"
    # result, chat_history = run_agent(
    #     topic,
    #     file_paths=None,
    #     agent_type="diagram",
    #     chat_history=chat_history
    # )
    # display_result(result, agent_type="diagram")
