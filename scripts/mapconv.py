#!/bin/python3
import xml.etree.ElementTree as ET
import sys


base32table : list[str] = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 
    'U', 'V']


def intToBase32Character(input : int) -> str:
    return base32table[max(0, min(int(input), 31))]


def parse_layer(input : str) -> str:
    out : str = ""
    for i in input.replace("\n", "").replace("\r","").split(","):
        out += intToBase32Character(int(i))
    return out


def parse_file(inp : str) -> str:

    root : ET.Element = ET.parse(inp).getroot()

    out : str = "\"" + intToBase32Character(root.attrib["width"]) + intToBase32Character(root.attrib["height"])
    for layer in root.iter("layer"):
        for data in layer.iter("data"):
            out += parse_layer(data.text)
            break
        break
    return out + "\""

print(parse_file(sys.argv[1]))
