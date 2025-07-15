from flask import Flask, render_template_string, request, jsonify
from mortgage_calculator import MortgageCalculator
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Удалён TEMPLATE и маршрут '/'

def get_table_html(calc: MortgageCalculator) -> str:
    res = calc.print_table(return_html=True)
    return res if res is not None else ''

def get_plot_html(calc: MortgageCalculator) -> str:
    res = calc.plot_graph(return_html=True)
    return res if res is not None else ''

def get_mode(data):
    mode = data.get('mode')
    if mode in ('property_value', 'monthly_payment'):
        return mode
    if data.get('property_value') is not None:
        return 'property_value'
    if data.get('monthly_payment') is not None:
        return 'monthly_payment'
    return None

@app.route('/api/calculate', methods=['POST'])
def api_calculate():
    try:
        print('--- /api/calculate called ---')
        print('Request JSON:', request.json)
        data = request.json
        interest_rate = float(data['interest_rate'])
        initial_payment = float(data['initial_payment'])
        min_initial_payment_percentage = float(data['min_initial_payment_percentage'])
        min_years = int(data['min_years'])
        max_years = int(data['max_years'])
        step = int(data.get('step', 0)) if 'step' in data and data['step'] else None
        property_value = data.get('property_value')
        monthly_payment = data.get('monthly_payment')
        mode = get_mode(data)
        if not mode:
            return jsonify({'error': 'Необходимо указать режим расчета (mode) или property_value/monthly_payment'}), 400
        calc = MortgageCalculator(
            interest_rate=interest_rate,
            initial_payment=initial_payment,
            min_initial_payment_percentage=min_initial_payment_percentage,
            mode=mode,
            property_value=property_value,
            monthly_payment=monthly_payment
        )
        if step:
            calc.calculate(min_years, max_years, step)
        else:
            calc.calculate(min_years, max_years)
        return jsonify(calc.results)
    except Exception as e:
        import traceback
        print('ERROR:', e)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400

@app.route('/api/annuity_payments', methods=['POST'])
def api_annuity_payments():
    try:
        data = request.json
        interest_rate = float(data['interest_rate'])
        initial_payment = float(data['initial_payment'])
        min_initial_payment_percentage = float(data['min_initial_payment_percentage'])
        months = data.get('months')
        if months is not None:
            years = float(months) / 12
        else:
            years = int(data['years'])
        mode = data.get('mode') #or get_mode(data)
        property_value = data.get('property_value')
        monthly_payment = data.get('monthly_payment')
        if not mode:
            return jsonify({'error': 'Необходимо указать режим расчета (mode) или property_value/monthly_payment'}), 400
        if mode == 'property_value':
            calc = MortgageCalculator(
                interest_rate=interest_rate,
                initial_payment=initial_payment,
                min_initial_payment_percentage=min_initial_payment_percentage,
                mode=mode,
                property_value=property_value
            )
        elif mode == 'monthly_payment':
            calc = MortgageCalculator(
                interest_rate=interest_rate,
                initial_payment=initial_payment,
                min_initial_payment_percentage=min_initial_payment_percentage,
                mode=mode,
                monthly_payment=monthly_payment
            )
        else:
            return jsonify({'error': 'Неизвестный режим расчета'}), 400
        plot_data, plot_layout = calc.plot_annuity_payments_data(int(round(years)), data.get('mode2', 'months'))
        return jsonify({'data': plot_data, 'layout': plot_layout})
    except Exception as e:
        import traceback
        print('ERROR:', e)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')