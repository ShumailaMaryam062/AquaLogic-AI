from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__, template_folder='templates', static_folder='static')

class WaterJugProblem:
    def __init__(self, jug1, jug2, goal):
        self.jug1 = jug1
        self.jug2 = jug2
        self.goal = goal
        self.seen = set()
        self.result_path = []
        self.steps = []
    
    def check_goal(self, state):
        x, y = state
        return x == self.goal or y == self.goal
    
    def possible_moves(self, state):
        x, y = state
        all_moves = []
        
        if x < self.jug1:
            new = (self.jug1, y)
            all_moves.append((new, f"Fill jug 1: {state} => {new}"))
        
        if y < self.jug2:
            new = (x, self.jug2)
            all_moves.append((new, f"Fill jug 2: {state} => {new}"))
        
        if x > 0:
            new = (0, y)
            all_moves.append((new, f"Empty jug 1: {state} => {new}"))
        
        if y > 0:
            new = (x, 0)
            all_moves.append((new, f"Empty jug 2: {state} => {new}"))
        
        if x > 0 and y < self.jug2:
            pour_amt = min(x, self.jug2 - y)
            new = (x - pour_amt, y + pour_amt)
            all_moves.append((new, f"Pour jug 1 to 2: {state} => {new}"))
        
        if y > 0 and x < self.jug1:
            pour_amt = min(y, self.jug1 - x)
            new = (x + pour_amt, y - pour_amt)
            all_moves.append((new, f"Pour jug 2 to 1: {state} => {new}"))
        
        return all_moves
    
    def dfs(self, current):
        if self.check_goal(current):
            self.result_path.append(current)
            return True
        
        if current in self.seen:
            return False
        
        self.seen.add(current)
        self.result_path.append(current)
        
        for next_s, action in self.possible_moves(current):
            self.steps.append(action)
            if self.dfs(next_s):
                return True
            self.steps.pop()
        
        self.result_path.pop()
        return False
    
    def solve(self):
        self.seen.clear()
        self.result_path.clear()
        self.steps.clear()
        return self.dfs((0, 0))
    
    def get_solution_data(self):
        return {
            'path': self.result_path,
            'steps': self.steps,
            'total_moves': len(self.result_path) - 1
        }


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/solve', methods=['POST'])
def solve():
    try:
        data = request.get_json()
        jug1_capacity = int(data.get('jug1'))
        jug2_capacity = int(data.get('jug2'))
        goal_liters = int(data.get('goal'))
        
        # Validation
        if jug1_capacity <= 0 or jug2_capacity <= 0 or goal_liters <= 0:
            return jsonify({'error': 'All values must be positive integers'}), 400
        
        if goal_liters > max(jug1_capacity, jug2_capacity):
            return jsonify({'error': 'Goal cannot exceed the larger jug capacity'}), 400
        
        problem = WaterJugProblem(jug1_capacity, jug2_capacity, goal_liters)
        if problem.solve():
            solution_data = problem.get_solution_data()
            return jsonify({
                'success': True,
                'jug1': jug1_capacity,
                'jug2': jug2_capacity,
                'goal': goal_liters,
                'path': solution_data['path'],
                'steps': solution_data['steps'],
                'total_moves': solution_data['total_moves']
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No solution found for the given parameters'
            }), 400
    
    except ValueError:
        return jsonify({'error': 'Invalid input format'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
